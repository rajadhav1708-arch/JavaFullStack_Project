import { Router, type Request, type Response } from 'express';
import { isDbConfigured, pool, DbUnavailableError } from '../db';
import { currentUser, type SessionUser } from '../auth';

export const khataRouter = Router();

const ACCOUNT_STATUSES = ['Pending', 'Approved', 'Rejected', 'Suspended', 'Closed'] as const;
type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'] as const;

function dbGuard(_req: Request, res: Response, next: () => void): void {
  if (!isDbConfigured || !pool) {
    res.status(503).json({ error: 'DB_DISABLED', message: 'DATABASE_URL is not set.' });
    return;
  }
  next();
}

async function requireUser(req: Request, res: Response): Promise<SessionUser | null> {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'NOT_AUTHENTICATED', message: 'Sign in to view your Khata.' });
    return null;
  }
  return user;
}

/** The ledger is the shop's money, so only staff may read every account. */
async function requireStaff(req: Request, res: Response): Promise<SessionUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'employee') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only shop staff can manage the Khata ledger.' });
    return null;
  }
  return user;
}

export function isStaff(user: SessionUser): boolean {
  return user.role === 'admin' || user.role === 'employee';
}

interface AccountRow {
  id: number;
  user_id: number | null;
  customer_code: string | null;
  customer_email: string | null;
  customer_name: string;
  phone: string;
  village: string;
  milk_union_member_id: string | null;
  credit_limit: string;
  due_date: string | null;
  status: AccountStatus;
  rejection_reason: string | null;
  requested_limit: string | null;
  decided_at: Date | null;
  outstanding: string;
  paid_total: string;
  purchase_total: string;
  last_purchase_date: string | null;
  entry_count: string;
}

/**
 * Outstanding is summed from the entries rather than read off the account, so a
 * payment is what reduces the debt. A stored running balance would have to be
 * kept in step by every write path, and the first one that forgot would leave a
 * farmer being chased for money already paid.
 *
 * is_debit (not entry_type) decides the sign, so an Adjustment that reverses a
 * Purchase reduces the balance and one that reverses a Payment raises it —
 * without the query needing to know why the row exists.
 */
const ACCOUNT_SELECT = `
  SELECT a.id, a.user_id, u.customer_code, u.email AS customer_email,
         a.customer_name, a.phone, a.village, a.milk_union_member_id,
         a.credit_limit, a.due_date, a.status, a.rejection_reason,
         a.requested_limit, a.decided_at,
         COALESCE(SUM(CASE WHEN e.is_debit THEN e.amount ELSE -e.amount END), 0) AS outstanding,
         COALESCE(SUM(CASE WHEN e.entry_type = 'Payment' THEN e.amount ELSE 0 END), 0)    AS paid_total,
         COALESCE(SUM(CASE WHEN e.entry_type = 'Purchase' THEN e.amount ELSE 0 END), 0)   AS purchase_total,
         MAX(CASE WHEN e.entry_type = 'Purchase' THEN e.entry_date END)                   AS last_purchase_date,
         COUNT(e.id)                                                                     AS entry_count
  FROM khata_accounts a
  LEFT JOIN users u ON u.id = a.user_id
  LEFT JOIN khata_entries e ON e.account_id = a.id
`;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Payment standing is derived, never stored: a stored column would need every
 * payment and every order to maintain it, and the day's clock decides "Overdue"
 * anyway. This is separate from `status`, which is the shop's lifecycle
 * decision (Pending / Approved / Suspended / ...).
 */
function paymentStatusFor(outstanding: number, paidTotal: number, dueDate: string | null): 'Paid' | 'Partially Paid' | 'Due' | 'Overdue' {
  if (outstanding <= 0) return 'Paid';
  if (dueDate && dueDate < todayIso()) return 'Overdue';
  return paidTotal > 0 ? 'Partially Paid' : 'Due';
}

function toAccount(row: AccountRow) {
  const outstanding = Math.round(Number(row.outstanding) * 100) / 100;
  const paidTotal = Math.round(Number(row.paid_total) * 100) / 100;
  const purchaseTotal = Math.round(Number(row.purchase_total) * 100) / 100;
  const creditLimit = Number(row.credit_limit);
  return {
    id: `kht-${row.id}`,
    customerId: row.user_id ? `user-${row.user_id}` : `kht-${row.id}`,
    customerCode: row.customer_code ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    customerName: row.customer_name,
    phone: row.phone,
    village: row.village,
    milkUnionMemberId: row.milk_union_member_id ?? undefined,
    totalCreditLimit: creditLimit,
    totalOutstanding: outstanding,
    /** How much of the limit is still usable for a new credit purchase. */
    availableCredit: Math.max(0, Math.round((creditLimit - outstanding) * 100) / 100),
    paidAmount: paidTotal,
    purchaseTotal,
    lastPurchaseDate: row.last_purchase_date ?? '',
    dueDate: row.due_date ?? '',
    /** Lifecycle: has the shop approved this farmer for credit? */
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
    requestedLimit: row.requested_limit !== null ? Number(row.requested_limit) : undefined,
    decidedAt: row.decided_at ? new Date(row.decided_at).toISOString().split('T')[0] : undefined,
    /** Derived payment standing, independent of the lifecycle status. */
    paymentStatus: paymentStatusFor(outstanding, paidTotal, row.due_date),
    entryCount: Number(row.entry_count),
  };
}

interface EntryRow {
  id: number;
  entry_type: 'Purchase' | 'Payment' | 'Adjustment';
  amount: string;
  is_debit: boolean;
  notes: string;
  entry_date: string;
  order_id: number | null;
  order_number: string | null;
  payment_method: string | null;
  recorded_by: number | null;
  recorded_by_name: string | null;
  reverses_entry_id: number | null;
}

/**
 * `to_char` on the DATE is deliberate: pg parses a DATE into a local-midnight
 * Date, which JSON-serialises back a day earlier east of UTC. See PROGRESS.md.
 */
const ENTRIES_SELECT = `
  SELECT e.id, e.entry_type, e.amount, e.is_debit, e.notes,
         to_char(e.entry_date, 'YYYY-MM-DD') AS entry_date,
         e.order_id, o.order_number, e.payment_method,
         e.recorded_by, u.name AS recorded_by_name, e.reverses_entry_id
  FROM khata_entries e
  LEFT JOIN orders o ON o.id = e.order_id
  LEFT JOIN users u ON u.id = e.recorded_by
  WHERE e.account_id = $1
  ORDER BY e.entry_date DESC, e.id DESC
  LIMIT $2
`;

function toEntry(row: EntryRow) {
  return {
    id: `tx-${row.id}`,
    date: row.entry_date,
    type: row.entry_type,
    amount: Number(row.amount),
    /** TRUE increases what the farmer owes; FALSE reduces it. */
    isDebit: row.is_debit,
    notes: row.notes,
    orderNumber: row.order_number ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    recordedBy: row.recorded_by_name ?? undefined,
    reversesEntryId: row.reverses_entry_id !== null ? `tx-${row.reverses_entry_id}` : undefined,
  };
}

/** Loads one account the caller is allowed to see, or null. */
async function loadVisibleAccount(accountId: number, user: SessionUser) {
  const result = await pool!.query<AccountRow>(
    `${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id, u.customer_code, u.email`,
    [accountId]
  );
  const row = result.rows[0];
  if (!row) return null;
  // A customer may only ever read their own Khata.
  if (!isStaff(user) && row.user_id !== user.id) return null;
  return row;
}

function parseAccountId(raw: string): number | null {
  const accountId = Number(String(raw).replace(/^kht-/, ''));
  return Number.isInteger(accountId) && accountId >= 1 ? accountId : null;
}

/* ---------------------------------- routes ---------------------------------- */

/**
 * GET /khata
 *  - staff: every account, searchable by name / village / phone / customer ID,
 *    filterable by lifecycle status (`?status=Pending` etc.; default all).
 *  - customer: their own account (any status, so a pending or rejected request
 *    is visible to them), matched by user_id — never by name or phone.
 */
khataRouter.get('/khata', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const params: unknown[] = [];
    let where = '';
    if (isStaff(user)) {
      const clauses: string[] = [];
      if (search) {
        params.push(`%${search}%`);
        clauses.push(
          `(a.customer_name ILIKE $${params.length} OR a.village ILIKE $${params.length}
            OR a.phone ILIKE $${params.length} OR u.customer_code ILIKE $${params.length}
            OR u.email ILIKE $${params.length})`
        );
      }
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      if (status && (ACCOUNT_STATUSES as readonly string[]).includes(status)) {
        params.push(status);
        clauses.push(`a.status = $${params.length}`);
      }
      if (clauses.length) where = `WHERE ${clauses.join(' AND ')}`;
    } else {
      // A customer's ledger is their own account, matched by user_id. There is
      // deliberately no fallback on name or phone: two farmers in one village
      // can share a surname.
      params.push(user.id);
      where = 'WHERE a.user_id = $1';
    }

    const rows = await pool!.query<AccountRow>(
      `${ACCOUNT_SELECT} ${where} GROUP BY a.id, u.customer_code, u.email ORDER BY
         CASE a.status WHEN 'Pending' THEN 0 ELSE 1 END,
         (COALESCE(SUM(CASE WHEN e.is_debit THEN e.amount ELSE -e.amount END), 0) > 0) DESC,
         a.customer_name`,
      params
    );

    res.json({ accounts: rows.rows.map(toAccount) });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      res.status(503).json({ error: 'DB_DISABLED', message: 'Database is unavailable.' });
      return;
    }
    console.error('[api/khata GET]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not load the Khata ledger.' });
  }
});

/**
 * Staff-only customer search for the "Create Khata account" flow. Finds an
 * EXISTING registered customer by name, email or permanent customer ID, so the
 * ledger links to the real account instead of inventing a second identity.
 */
khataRouter.get('/khata/customers/search', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!search) {
      res.json({ customers: [] });
      return;
    }

    const rows = await pool!.query<{
      id: number;
      customer_code: string;
      email: string | null;
      name: string;
      village: string | null;
      has_khata: boolean;
    }>(
      `SELECT u.id, u.customer_code, u.email, u.name, u.village,
              EXISTS (SELECT 1 FROM khata_accounts k WHERE k.user_id = u.id) AS has_khata
       FROM users u
       WHERE u.role = 'customer'
         AND (u.name ILIKE $1 OR u.email ILIKE $1 OR u.customer_code ILIKE $1)
       ORDER BY u.name
       LIMIT 20`,
      [`%${search}%`]
    );

    res.json({
      customers: rows.rows.map((r) => ({
        id: r.id,
        customerCode: r.customer_code,
        email: r.email ?? undefined,
        name: r.name,
        village: r.village ?? '',
        hasKhata: r.has_khata,
      })),
    });
  } catch (error) {
    console.error('[api/khata/customers/search]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not search customers.' });
  }
});

khataRouter.get('/khata/:id', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    // The UI passes "kht-3"; that 3 is the real row id.
    const accountId = parseAccountId(req.params.id);
    if (accountId === null) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid Khata id is required.' });
      return;
    }

    const row = await loadVisibleAccount(accountId, user);
    if (!row) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No such Khata account.' });
      return;
    }

    const entries = await pool!.query<EntryRow>(ENTRIES_SELECT, [accountId, 200]);
    res.json({ account: { ...toAccount(row), transactions: entries.rows.map(toEntry) } });
  } catch (error) {
    console.error('[api/khata/:id GET]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not load the Khata ledger.' });
  }
});

/**
 * Customer requests a Khata account. Creates a Pending account linked to the
 * signed-in user; the shop approves or rejects it from the admin ledger. A
 * previously rejected request may be re-submitted (it flips back to Pending).
 */
khataRouter.post('/khata/request', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (isStaff(user)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Shop staff create Khata accounts directly.' });
      return;
    }

    const body = (req.body ?? {}) as {
      phone?: string;
      village?: string;
      requestedLimit?: number;
      consent?: boolean;
    };

    const phone = body.phone?.trim();
    if (!phone || !/^[0-9+\-\s()]{7,15}$/.test(phone)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid phone number is required.' });
      return;
    }
    if (body.consent !== true) {
      res.status(400).json({
        error: 'CONSENT_REQUIRED',
        message: 'Please confirm you understand that Khata purchases must be repaid.',
      });
      return;
    }
    let requestedLimit = 0;
    if (body.requestedLimit !== undefined) {
      requestedLimit = body.requestedLimit;
      if (typeof requestedLimit !== 'number' || !Number.isFinite(requestedLimit) || requestedLimit < 0) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Requested limit must be zero or more.' });
        return;
      }
    }

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      // Lock the user's existing account row (if any) so two parallel requests
      // cannot both create one — user_id is UNIQUE, but the error would be an
      // ugly 500 instead of a clean "already pending" message.
      const existing = await client.query<{
        id: number;
        status: AccountStatus;
      }>('SELECT id, status FROM khata_accounts WHERE user_id = $1 FOR UPDATE', [user.id]);

      const current = existing.rows[0];
      if (current) {
        if (current.status === 'Pending') {
          await client.query('ROLLBACK');
          res.status(409).json({ error: 'ALREADY_REQUESTED', message: 'Your Khata request is already pending review.' });
          return;
        }
        if (current.status === 'Approved' || current.status === 'Suspended') {
          await client.query('ROLLBACK');
          res.status(409).json({ error: 'ALREADY_HAS_KHATA', message: 'You already have a Khata account. Please speak to the shop.' });
          return;
        }
        if (current.status === 'Closed') {
          await client.query('ROLLBACK');
          res.status(409).json({ error: 'ACCOUNT_CLOSED', message: 'This Khata was closed. Please speak to the shop to reopen it.' });
          return;
        }
        // Rejected → allow re-request: flip the same row back to Pending with
        // the new details. Reusing the row keeps the id and any history stable.
        const updated = await client.query<AccountRow>(
          `UPDATE khata_accounts
           SET status = 'Pending', phone = $1, village = $2, requested_limit = $3,
               credit_limit = 0, rejection_reason = NULL, decided_at = NULL, decided_by = NULL
           WHERE id = $4
           RETURNING id`,
          [phone, body.village?.trim() ?? '', requestedLimit, current.id]
        );
        await client.query('COMMIT');
        res.status(200).json({
          ok: true,
          message: 'Request resubmitted. The shop will review it shortly.',
          accountId: `kht-${updated.rows[0].id}`,
        });
        return;
      }

      const inserted = await client.query<{ id: number }>(
        `INSERT INTO khata_accounts (user_id, customer_name, phone, village, credit_limit, requested_limit, status)
         VALUES ($1, $2, $3, $4, 0, $5, 'Pending')
         RETURNING id`,
        [user.id, user.name, phone, body.village?.trim() ?? user.village ?? '', requestedLimit]
      );
      await client.query('COMMIT');
      res.status(201).json({
        ok: true,
        message: 'Khata request submitted. The shop will review it shortly.',
        accountId: `kht-${inserted.rows[0].id}`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[api/khata/request]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not submit the Khata request.' });
  }
});

/**
 * Staff creates a Khata account for an EXISTING registered customer. The
 * account is created already Approved: the owner opening it in front of the
 * farmer IS the approval. Unlinked (walk-in) accounts are no longer created —
 * registration no longer needs an email, so every farmer can hold a site
 * account and see their own ledger.
 */
khataRouter.post('/khata', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const body = (req.body ?? {}) as {
      userId?: number;
      customerName?: string;
      phone?: string;
      village?: string;
      milkUnionMemberId?: string;
      creditLimit?: number;
      dueDate?: string;
    };

    const phone = body.phone?.trim();
    if (!phone) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A phone number is required.' });
      return;
    }
    const creditLimit = body.creditLimit ?? 0;
    if (typeof creditLimit !== 'number' || !Number.isFinite(creditLimit) || creditLimit < 0) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Credit limit must be zero or more.' });
      return;
    }
    if (body.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Due date must be YYYY-MM-DD.' });
      return;
    }
    if (!Number.isInteger(body.userId) || (body.userId as number) < 1) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Select the customer this Khata belongs to.' });
      return;
    }

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');

      const customer = await client.query<{ id: number; name: string; village: string | null }>(
        `SELECT id, name, village FROM users WHERE id = $1 AND role = 'customer' FOR UPDATE`,
        [body.userId]
      );
      const row = customer.rows[0];
      if (!row) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'NO_SUCH_USER', message: 'No such customer account.' });
        return;
      }

      const existing = await client.query<{ status: AccountStatus }>(
        'SELECT status FROM khata_accounts WHERE user_id = $1',
        [row.id]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'ALREADY_LINKED',
          message: `${row.name} already has a Khata account (${existing.rows[0].status}).`,
        });
        return;
      }

      const inserted = await client.query<{ id: number }>(
        `INSERT INTO khata_accounts
           (user_id, customer_name, phone, village, milk_union_member_id, credit_limit, due_date,
            status, decided_at, decided_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Approved', now(), $8)
         RETURNING id`,
        [
          row.id,
          body.customerName?.trim() || row.name,
          phone,
          body.village?.trim() ?? row.village ?? '',
          body.milkUnionMemberId?.trim() || null,
          creditLimit,
          body.dueDate || null,
          user.id,
        ]
      );
      await client.query('COMMIT');

      const full = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id, u.customer_code, u.email`, [inserted.rows[0].id]);
      res.status(201).json({ account: toAccount(full.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[api/khata POST]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not open the Khata account.' });
  }
});

/** Approve or reject a customer's Pending request. */
khataRouter.post('/khata/:id/decision', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const accountId = parseAccountId(req.params.id);
    if (accountId === null) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid Khata id is required.' });
      return;
    }

    const body = (req.body ?? {}) as { decision?: string; creditLimit?: number; reason?: string };
    if (body.decision !== 'approve' && body.decision !== 'reject') {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Decision must be "approve" or "reject".' });
      return;
    }
    const reason = body.reason?.trim() || null;
    if (body.decision === 'reject' && !reason) {
      res.status(400).json({ error: 'REASON_REQUIRED', message: 'Record why the request is being rejected.' });
      return;
    }

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query<{ id: number; status: AccountStatus; requested_limit: string | null; customer_name: string }>(
        'SELECT id, status, requested_limit, customer_name FROM khata_accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );
      const account = locked.rows[0];
      if (!account) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'NOT_FOUND', message: 'No such Khata account.' });
        return;
      }
      if (account.status !== 'Pending') {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'NOT_PENDING',
          message: `This account is ${account.status}, not pending — the request has already been decided.`,
        });
        return;
      }

      if (body.decision === 'approve') {
        // The limit the farmer asked for is the default; the owner can override
        // it at approval time (most shops negotiate the number face to face).
        const limit = body.creditLimit ?? (account.requested_limit !== null ? Number(account.requested_limit) : 0);
        if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 0) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'BAD_REQUEST', message: 'Credit limit must be zero or more.' });
          return;
        }
        await client.query(
          `UPDATE khata_accounts
           SET status = 'Approved', credit_limit = $1, rejection_reason = NULL,
               decided_at = now(), decided_by = $2
           WHERE id = $3`,
          [limit, user.id, accountId]
        );
      } else {
        await client.query(
          `UPDATE khata_accounts
           SET status = 'Rejected', rejection_reason = $1, credit_limit = 0,
               decided_at = now(), decided_by = $2
           WHERE id = $3`,
          [reason, user.id, accountId]
        );
      }
      await client.query('COMMIT');

      const full = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id, u.customer_code, u.email`, [accountId]);
      res.json({
        account: toAccount(full.rows[0]),
        message: body.decision === 'approve'
          ? `${account.customer_name}'s Khata is now approved.`
          : `${account.customer_name}'s request has been rejected.`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[api/khata/decision]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not record the decision.' });
  }
});

/**
 * Lifecycle changes on an existing account: suspend credit, reactivate it, or
 * close the account once the balance is settled.
 */
khataRouter.post('/khata/:id/status', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const accountId = parseAccountId(req.params.id);
    if (accountId === null) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid Khata id is required.' });
      return;
    }

    const body = (req.body ?? {}) as { status?: string; reason?: string };
    const target = body.status;
    if (target !== 'Approved' && target !== 'Suspended' && target !== 'Closed') {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Status must be Approved (activate), Suspended or Closed.',
      });
      return;
    }
    const reason = body.reason?.trim() || null;

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query<{ id: number; status: AccountStatus; customer_name: string }>(
        'SELECT id, status, customer_name FROM khata_accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );
      const account = locked.rows[0];
      if (!account) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'NOT_FOUND', message: 'No such Khata account.' });
        return;
      }

      const allowed: Record<string, AccountStatus[]> = {
        Approved: ['Suspended', 'Closed'],
        Suspended: ['Approved', 'Closed'],
        Closed: [],
        Pending: ['Suspended', 'Closed'],
        Rejected: ['Suspended', 'Closed'],
      };
      if (!allowed[account.status]?.includes(target as AccountStatus)) {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'INVALID_TRANSITION',
          message: `A ${account.status} account cannot become ${target}.`,
        });
        return;
      }

      if (target === 'Closed') {
        const totals = await client.query<{ outstanding: string }>(
          `SELECT COALESCE(SUM(CASE WHEN is_debit THEN amount ELSE -amount END), 0) AS outstanding
           FROM khata_entries WHERE account_id = $1`,
          [accountId]
        );
        if (Math.round(Number(totals.rows[0].outstanding) * 100) / 100 > 0) {
          await client.query('ROLLBACK');
          res.status(409).json({
            error: 'BALANCE_DUE',
            message: `${account.customer_name} still has an outstanding balance. Collect it before closing the account.`,
          });
          return;
        }
      }

      if ((target === 'Suspended' || target === 'Closed') && !reason) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'REASON_REQUIRED', message: 'Record why this account is being changed.' });
        return;
      }

      await client.query(
        `UPDATE khata_accounts
         SET status = $1,
             rejection_reason = CASE WHEN $1 = 'Rejected' THEN $2 ELSE rejection_reason END,
             decided_at = now(), decided_by = $3
         WHERE id = $4`,
        [target, reason, user.id, accountId]
      );
      // For suspend/close the human-readable reason rides on rejection_reason
      // only for Rejected; for the others it is returned in the message and the
      // decision trail (decided_at/decided_by) records who acted.
      await client.query('COMMIT');

      const full = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id, u.customer_code, u.email`, [accountId]);
      res.json({
        account: toAccount(full.rows[0]),
        message: `${account.customer_name}'s Khata is now ${target.toLowerCase()}.${reason ? ` Reason: ${reason}` : ''}`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[api/khata/status]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the account status.' });
  }
});

khataRouter.patch('/khata/:id', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const accountId = parseAccountId(req.params.id);
    if (accountId === null) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid Khata id is required.' });
      return;
    }

    const body = (req.body ?? {}) as {
      creditLimit?: number;
      dueDate?: string | null;
      milkUnionMemberId?: string | null;
    };

    // Built as a partial update so raising a credit limit does not blank the
    // village or the phone number.
    const sets: string[] = [];
    const params: unknown[] = [];
    if (body.creditLimit !== undefined) {
      if (typeof body.creditLimit !== 'number' || !Number.isFinite(body.creditLimit) || body.creditLimit < 0) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Credit limit must be zero or more.' });
        return;
      }
      params.push(body.creditLimit);
      sets.push(`credit_limit = $${params.length}`);
    }
    if (body.dueDate !== undefined) {
      if (body.dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Due date must be YYYY-MM-DD or null.' });
        return;
      }
      params.push(body.dueDate);
      sets.push(`due_date = $${params.length}`);
    }
    if (body.milkUnionMemberId !== undefined) {
      params.push(body.milkUnionMemberId?.trim() || null);
      sets.push(`milk_union_member_id = $${params.length}`);
    }
    if (sets.length === 0) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Nothing to update.' });
      return;
    }

    params.push(accountId);
    const updated = await pool!.query(
      `UPDATE khata_accounts SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params
    );
    if (updated.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No such Khata account.' });
      return;
    }

    const row = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id, u.customer_code, u.email`, [accountId]);
    res.json({ account: toAccount(row.rows[0]) });
  } catch (error) {
    console.error('[api/khata PATCH]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the Khata account.' });
  }
});

/**
 * Records a payment against the ledger.
 *
 * Rejects anything above the outstanding balance rather than letting it go
 * negative: an overpayment is a real situation, but it is the shop's decision
 * how to refund or carry it forward, not something an over-typed field should
 * quietly turn into a credit.
 */
khataRouter.post('/khata/:id/payment', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const accountId = parseAccountId(req.params.id);
    if (accountId === null) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid Khata id is required.' });
      return;
    }

    const body = (req.body ?? {}) as { amount?: number; notes?: string; paymentMethod?: string };
    const amount = body.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'BAD_AMOUNT', message: 'A payment amount greater than zero is required.' });
      return;
    }
    const paymentMethod = (PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod ?? '')
      ? body.paymentMethod
      : 'Cash';

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');

      // Lock the account row itself so two cashiers cannot both read the same
      // outstanding balance and both write a payment against it. The sum is a
      // separate query because FOR UPDATE cannot be combined with GROUP BY.
      const locked = await client.query<{ customer_name: string; status: AccountStatus }>(
        'SELECT customer_name, status FROM khata_accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );
      const current = locked.rows[0];
      if (!current) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'NOT_FOUND', message: 'No such Khata account.' });
        return;
      }
      if (current.status === 'Closed' || current.status === 'Pending' || current.status === 'Rejected') {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'ACCOUNT_NOT_ACTIVE',
          message: `Payments cannot be recorded against a ${current.status.toLowerCase()} account.`,
        });
        return;
      }

      const totals = await client.query<{ outstanding: string }>(
        `SELECT COALESCE(SUM(CASE WHEN is_debit THEN amount ELSE -amount END), 0) AS outstanding
         FROM khata_entries WHERE account_id = $1`,
        [accountId]
      );
      const outstanding = Math.round(Number(totals.rows[0].outstanding) * 100) / 100;
      if (outstanding <= 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'NOTHING_DUE', message: `${current.customer_name} has no outstanding balance.` });
        return;
      }
      if (amount > outstanding) {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'OVERPAYMENT',
          message: `Payment of Rs ${amount} exceeds the Rs ${outstanding} owed by ${current.customer_name}.`,
        });
        return;
      }

      await client.query(
        `INSERT INTO khata_entries (account_id, entry_type, amount, is_debit, notes, recorded_by, payment_method)
         VALUES ($1, 'Payment', $2, false, $3, $4, $5)`,
        [accountId, amount, body.notes?.trim() || `${paymentMethod} payment received at shop counter`, user.id, paymentMethod]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const row = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id, u.customer_code, u.email`, [accountId]);
    const entries = await pool!.query<EntryRow>(ENTRIES_SELECT, [accountId, 200]);
    res.json({ account: { ...toAccount(row.rows[0]), transactions: entries.rows.map(toEntry) } });
  } catch (error) {
    console.error('[api/khata payment]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not record the payment.' });
  }
});

/**
 * Corrects a mistaken entry with an auditable Adjustment instead of editing
 * history. The original row stays exactly as written; the Adjustment reverses
 * its effect (a Purchase is cancelled by a credit Adjustment, a Payment by a
 * debit Adjustment) and points back at the entry being corrected. The unique
 * index on reverses_entry_id stops the same row being reversed twice.
 */
khataRouter.post('/khata/:id/entries/:entryId/reverse', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const accountId = parseAccountId(req.params.id);
    const entryId = Number(String(req.params.entryId).replace(/^tx-/, ''));
    if (accountId === null || !Number.isInteger(entryId) || entryId < 1) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid Khata id and entry id are required.' });
      return;
    }

    const reason = (req.body ?? {}).reason;
    if (typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ error: 'REASON_REQUIRED', message: 'Record why this entry is being reversed.' });
      return;
    }

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query<{
        id: number;
        entry_type: 'Purchase' | 'Payment' | 'Adjustment';
        amount: string;
        is_debit: boolean;
      }>(
        'SELECT id, entry_type, amount, is_debit FROM khata_entries WHERE id = $1 AND account_id = $2 FOR UPDATE',
        [entryId, accountId]
      );
      const entry = locked.rows[0];
      if (!entry) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'NOT_FOUND', message: 'No such ledger entry.' });
        return;
      }
      if (entry.entry_type === 'Adjustment') {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'ALREADY_ADJUSTMENT',
          message: 'Adjustments are corrections themselves — reverse the original entry instead.',
        });
        return;
      }

      try {
        await client.query(
          `INSERT INTO khata_entries (account_id, entry_type, amount, is_debit, notes, recorded_by, reverses_entry_id)
           VALUES ($1, 'Adjustment', $2, $3, $4, $5, $6)`,
          [
            accountId,
            entry.amount,
            !entry.is_debit,
            `Reversal of ${entry.entry_type.toLowerCase()} tx-${entry.id}: ${reason.trim()}`,
            user.id,
            entry.id,
          ]
        );
      } catch (insertError) {
        if (typeof insertError === 'object' && insertError !== null && (insertError as { code?: string }).code === '23505') {
          await client.query('ROLLBACK');
          res.status(409).json({ error: 'ALREADY_REVERSED', message: 'This entry has already been reversed.' });
          return;
        }
        throw insertError;
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const row = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id, u.customer_code, u.email`, [accountId]);
    const entries = await pool!.query<EntryRow>(ENTRIES_SELECT, [accountId, 200]);
    res.json({ account: { ...toAccount(row.rows[0]), transactions: entries.rows.map(toEntry) } });
  } catch (error) {
    console.error('[api/khata reverse]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not reverse the entry.' });
  }
});

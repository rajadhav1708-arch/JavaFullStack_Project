import { Router, type Request, type Response } from 'express';
import { isDbConfigured, pool, DbUnavailableError } from '../db';
import { currentUser, type SessionUser } from '../auth';

export const khataRouter = Router();

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
  customer_name: string;
  phone: string;
  village: string;
  milk_union_member_id: string | null;
  credit_limit: string;
  due_date: string | null;
  outstanding: string;
  paid_total: string;
  last_purchase_date: string | null;
  entry_count: string;
}

/**
 * Outstanding is summed from the entries rather than read off the account, so a
 * payment is what reduces the debt. A stored running balance would have to be
 * kept in step by every write path, and the first one that forgot would leave a
 * farmer being chased for money already paid.
 *
 * GREATEST(0, ...) hides a negative balance (overpayment) from the outstanding
 * figure; the raw sum is still available in `last_purchase_date`-style detail.
 */
const ACCOUNT_SELECT = `
  SELECT a.id, a.user_id, a.customer_name, a.phone, a.village,
         a.milk_union_member_id, a.credit_limit, a.due_date,
         COALESCE(SUM(CASE WHEN e.entry_type = 'Purchase' THEN e.amount ELSE -e.amount END), 0) AS outstanding,
         COALESCE(SUM(CASE WHEN e.entry_type = 'Payment' THEN e.amount ELSE 0 END), 0)    AS paid_total,
         MAX(CASE WHEN e.entry_type = 'Purchase' THEN e.entry_date END)                  AS last_purchase_date,
         COUNT(e.id)                                                                   AS entry_count
  FROM khata_accounts a
  LEFT JOIN khata_entries e ON e.account_id = a.id
`;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Status is derived, never stored: a status column would need every payment and
 * every order to maintain it, and the day's clock decides "Overdue" anyway.
 */
function statusFor(outstanding: number, paidTotal: number, dueDate: string | null): 'Paid' | 'Partially Paid' | 'Due' | 'Overdue' {
  if (outstanding <= 0) return 'Paid';
  if (dueDate && dueDate < todayIso()) return 'Overdue';
  return paidTotal > 0 ? 'Partially Paid' : 'Due';
}

function toAccount(row: AccountRow) {
  const outstanding = Math.round(Number(row.outstanding) * 100) / 100;
  const paidTotal = Math.round(Number(row.paid_total) * 100) / 100;
  return {
    id: `kht-${row.id}`,
    customerId: row.user_id ? `user-${row.user_id}` : `kht-${row.id}`,
    customerName: row.customer_name,
    phone: row.phone,
    village: row.village,
    milkUnionMemberId: row.milk_union_member_id ?? undefined,
    totalCreditLimit: Number(row.credit_limit),
    totalOutstanding: outstanding,
    paidAmount: paidTotal,
    lastPurchaseDate: row.last_purchase_date ?? '',
    dueDate: row.due_date ?? '',
    status: statusFor(outstanding, paidTotal, row.due_date),
    entryCount: Number(row.entry_count),
  };
}

interface EntryRow {
  id: number;
  entry_type: 'Purchase' | 'Payment';
  amount: string;
  notes: string;
  entry_date: string;
  order_id: number | null;
  order_number: string | null;
}

/**
 * `to_char` on the DATE is deliberate: pg parses a DATE into a local-midnight
 * Date, which JSON-serialises back a day earlier east of UTC. See PROGRESS.md.
 */
const ENTRIES_SELECT = `
  SELECT e.id, e.entry_type, e.amount, e.notes,
         to_char(e.entry_date, 'YYYY-MM-DD') AS entry_date,
         e.order_id, o.order_number
  FROM khata_entries e
  LEFT JOIN orders o ON o.id = e.order_id
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
    notes: row.notes,
    orderNumber: row.order_number ?? undefined,
  };
}

/** Loads one account the caller is allowed to see, or null. */
async function loadVisibleAccount(accountId: number, user: SessionUser) {
  const result = await pool!.query<AccountRow>(
    `${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id`,
    [accountId]
  );
  const row = result.rows[0];
  if (!row) return null;
  // A customer may only ever read their own Khata.
  if (!isStaff(user) && row.user_id !== user.id) return null;
  return row;
}

/* ---------------------------------- routes ---------------------------------- */

khataRouter.get('/khata', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const params: unknown[] = [];
    let where = '';
    if (isStaff(user)) {
      if (search) {
        params.push(`%${search}%`);
        where = `WHERE a.customer_name ILIKE $1 OR a.village ILIKE $1 OR a.phone ILIKE $1`;
      }
    } else {
      // A customer's ledger is their own account, matched by user_id. There is
      // deliberately no fallback on name or phone: two farmers in one village
      // can share a surname.
      params.push(user.id);
      where = 'WHERE a.user_id = $1';
    }

    const rows = await pool!.query<AccountRow>(
      `${ACCOUNT_SELECT} ${where} GROUP BY a.id ORDER BY
         (COALESCE(SUM(CASE WHEN e.entry_type = 'Purchase' THEN e.amount ELSE -e.amount END), 0) > 0) DESC,
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

khataRouter.get('/khata/:id', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    // The UI passes "kht-3"; that 3 is the real row id.
    const accountId = Number(String(req.params.id).replace(/^kht-/, ''));
    if (!Number.isInteger(accountId) || accountId < 1) {
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

khataRouter.post('/khata', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const body = (req.body ?? {}) as {
      customerName?: string;
      phone?: string;
      village?: string;
      milkUnionMemberId?: string;
      creditLimit?: number;
      dueDate?: string;
      /** Site account to link, by email. Lets the farmer see their own ledger. */
      email?: string;
    };

    const name = body.customerName?.trim();
    const phone = body.phone?.trim();
    if (!name || !phone) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A farmer name and phone number are required.' });
      return;
    }
    // 0 is a legitimate opening position ("no credit yet"), but a negative or
    // non-finite limit would silently allow unlimited buying.
    const creditLimit = body.creditLimit ?? 0;
    if (typeof creditLimit !== 'number' || !Number.isFinite(creditLimit) || creditLimit < 0) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Credit limit must be zero or more.' });
      return;
    }
    if (body.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Due date must be YYYY-MM-DD.' });
      return;
    }

    // Link to the site account by email. `users` has no phone column, so email
    // is the only identifier both sides share. An unknown or blank email simply
    // leaves the account unlinked: plenty of khata farmers never log in.
    let linkedUserId: number | null = null;
    if (body.email?.trim()) {
      const linked = await pool!.query<{ id: number }>(
        'SELECT id FROM users WHERE lower(email) = lower($1)',
        [body.email.trim()]
      );
      if (linked.rows.length === 0) {
        res.status(404).json({ error: 'NO_SUCH_USER', message: `No account found for ${body.email.trim()}.` });
        return;
      }
      linkedUserId = linked.rows[0].id;

      // A second khata for the same account would make "my ledger" ambiguous.
      const existing = await pool!.query('SELECT 1 FROM khata_accounts WHERE user_id = $1', [linkedUserId]);
      if (existing.rowCount) {
        res.status(409).json({ error: 'ALREADY_LINKED', message: 'That account already has a Khata.' });
        return;
      }
    }

    const inserted = await pool!.query<AccountRow>(
      `INSERT INTO khata_accounts (user_id, customer_name, phone, village, milk_union_member_id, credit_limit, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, customer_name, phone, village, milk_union_member_id,
                 credit_limit, to_char(due_date, 'YYYY-MM-DD') AS due_date,
                 0 AS outstanding, 0 AS paid_total, NULL AS last_purchase_date, 0 AS entry_count`,
      [
        linkedUserId,
        name,
        phone,
        body.village?.trim() ?? '',
        body.milkUnionMemberId?.trim() || null,
        creditLimit,
        body.dueDate || null,
      ]
    );

    res.status(201).json({ account: toAccount(inserted.rows[0]) });
  } catch (error) {
    console.error('[api/khata POST]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not open the Khata account.' });
  }
});

khataRouter.patch('/khata/:id', dbGuard, async (req, res) => {
  try {
    const user = await requireStaff(req, res);
    if (!user) return;

    const accountId = Number(String(req.params.id).replace(/^kht-/, ''));
    if (!Number.isInteger(accountId) || accountId < 1) {
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
    const updated = await pool!.query<AccountRow>(
      `UPDATE khata_accounts SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, user_id, customer_name, phone, village, milk_union_member_id,
                 credit_limit, to_char(due_date, 'YYYY-MM-DD') AS due_date,
                 0 AS outstanding, 0 AS paid_total, NULL AS last_purchase_date, 0 AS entry_count`,
      params
    );
    if (updated.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No such Khata account.' });
      return;
    }

    const row = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id`, [accountId]);
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

    const accountId = Number(String(req.params.id).replace(/^kht-/, ''));
    if (!Number.isInteger(accountId) || accountId < 1) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid Khata id is required.' });
      return;
    }

    const body = (req.body ?? {}) as { amount?: number; notes?: string };
    const amount = body.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'BAD_AMOUNT', message: 'A payment amount greater than zero is required.' });
      return;
    }

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');

      // Lock the account row itself so two cashiers cannot both read the same
      // outstanding balance and both write a payment against it. The sum is a
      // separate query because FOR UPDATE cannot be combined with GROUP BY.
      const locked = await client.query<{ customer_name: string }>(
        'SELECT customer_name FROM khata_accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );
      const current = locked.rows[0];
      if (!current) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'NOT_FOUND', message: 'No such Khata account.' });
        return;
      }

      const totals = await client.query<{ outstanding: string }>(
        `SELECT COALESCE(SUM(CASE WHEN entry_type = 'Purchase' THEN amount ELSE -amount END), 0) AS outstanding
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
        `INSERT INTO khata_entries (account_id, entry_type, amount, notes)
         VALUES ($1, 'Payment', $2, $3)`,
        [accountId, amount, body.notes?.trim() || 'Cash/UPI payment at shop counter']
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const row = await pool!.query<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = $1 GROUP BY a.id`, [accountId]);
    const entries = await pool!.query<EntryRow>(ENTRIES_SELECT, [accountId, 200]);
    res.json({ account: { ...toAccount(row.rows[0]), transactions: entries.rows.map(toEntry) } });
  } catch (error) {
    console.error('[api/khata payment]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not record the payment.' });
  }
});
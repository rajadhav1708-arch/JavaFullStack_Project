import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { isDbConfigured, query, DbUnavailableError } from '../db';
import {
  hashPassword,
  verifyPassword,
  signSession,
  clearSessionCookie,
  setSessionCookie,
  currentUser,
  issuePasswordResetToken,
  resetPasswordWithToken,
  type SessionUser,
} from '../auth';

export const authRouter = Router();

const MIN_PASSWORD_LENGTH = 8;

/** 503 while DATABASE_URL is unset, so the storefront still runs without a DB. */
function dbGuard(_req: Request, res: Response, next: () => void): void {
  if (!isDbConfigured) {
    res.status(503).json({
      error: 'DB_DISABLED',
      message: 'DATABASE_URL is not set, so accounts are unavailable. See .env.example.',
    });
    return;
  }
  next();
}

const limiter = (limit: number, windowMs = 15 * 60 * 1000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message: 'Too many attempts. Please wait a few minutes and try again.',
    },
  });

const loginLimiter = limiter(5);
const registerLimiter = limiter(5, 60 * 60 * 1000);
const forgotLimiter = limiter(3);
const resetLimiter = limiter(5);

const emailSchema = z.string().trim().max(254).refine(
  (value) => value === '' || z.string().email().safeParse(value).success,
  'Enter a valid email address.'
);

const registerSchema = z.object({
  // Email is optional: a village customer who only has a phone number must not
  // be forced to invent a fake address. When present it must be valid, and it
  // unlocks the self-service password-reset link.
  email: emailSchema.optional().default(''),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(120, 'Username is too long.')
    .refine(
      (value) => /^[a-z0-9_-]+$/i.test(value),
      'Username may only contain letters, numbers, underscores and hyphens.'
    ),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(200, 'Password is too long.'),
  name: z.string().trim().min(1, 'Enter your name.').max(120, 'Name is too long.'),
  village: z.string().trim().max(120, 'Village name is too long.').optional().default(''),
});

// Login accepts EITHER the permanent Customer ID (HT-CUS-10042) or the
// username. Email is no longer a login identifier (it stays optional for
// password reset only).
const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your username or Customer ID.').max(254),
  password: z.string().min(1, 'Enter your password.').max(200),
});

const forgotSchema = z.object({ email: emailSchema });

const resetSchema = z.object({
  token: z.string().min(32, 'This reset link is invalid.').max(128),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(200, 'Password is too long.'),
});

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the details and try again.';
}

/** Never echo which part of the credentials was wrong. */
function unauthorized(res: Response): void {
  res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Customer ID or password is incorrect.' });
}

function sendUser(res: Response, user: SessionUser): void {
  res.json({ user });
}

function appOrigin(req: Request): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

authRouter.post('/register', registerLimiter, dbGuard, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', message: validationMessage(parsed.error) });
    return;
  }

  const { password, name, village } = parsed.data;
  const normalisedEmail = parsed.data.email ? normaliseEmail(parsed.data.email) : null;

  try {
    // Role is hard-coded to 'customer'. A client can never request 'admin'.
    // The permanent Customer ID comes from a Postgres sequence, so two people
    // registering at the same instant cannot be handed the same ID — the unique
    // index would reject the second insert rather than silently collide. The
    // username is also unique, so two customers cannot pick the same handle.
    const rows = await query<SessionUser & { session_version: number }>(
      `INSERT INTO users (email, username, password_hash, name, role, village, customer_code)
       VALUES ($1, $2, $3, $4, 'customer', $5, 'HT-CUS-' || nextval('customer_code_seq'))
       RETURNING id, email, username, customer_code AS "customerCode", name, role, village, session_version`,
      [normalisedEmail, parsed.data.username || null, await hashPassword(password), name, village || null]
    );

    const { session_version, ...user } = rows[0];
    setSessionCookie(res, signSession(user, session_version));
    sendUser(res, user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'USERNAME_TAKEN', message: 'That username is already taken. Choose another.' });
      return;
    }
    if (error instanceof DbUnavailableError) {
      res.status(503).json({ error: 'DB_DISABLED', message: 'Accounts are unavailable right now.' });
      return;
    }
    console.error('[api/auth/register]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not create the account.' });
  }
});

authRouter.post('/login', loginLimiter, dbGuard, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    unauthorized(res);
    return;
  }

    const identifier = parsed.data.identifier.trim();

    try {
      // Match on the permanent Customer ID or the username. customer_code
      // comparison is upper-cased on both sides so "ht-cus-10042" also works;
      // username comparison is lower-case.
      const rows = await query<SessionUser & { password_hash: string; session_version: number }>(
        `SELECT id, email, username, customer_code AS "customerCode", name, role, village, password_hash, session_version
         FROM users
         WHERE upper(customer_code) = upper($1) OR (username IS NOT NULL AND lower(username) = lower($1))`,
        [identifier]
      );

    const user = rows[0];
    // Hash even when the user is missing so timing does not reveal whether the
    // email exists.
    const passwordMatches = user
      ? await verifyPassword(parsed.data.password, user.password_hash)
      : await verifyPassword(parsed.data.password, 'deadbeef:deadbeef');

    if (!user || !passwordMatches) {
      unauthorized(res);
      return;
    }

    const { password_hash: _discarded, session_version, ...safeUser } = user;
    setSessionCookie(res, signSession(safeUser, session_version));
    sendUser(res, safeUser);
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      res.status(503).json({ error: 'DB_DISABLED', message: 'Accounts are unavailable right now.' });
      return;
    }
    console.error('[api/auth/login]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not sign in.' });
  }
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/**
 * Always answers with the same message so the endpoint cannot be used to list
 * registered emails. The reset link is written to the server log until SMTP is
 * configured; in development the link is also returned so the flow is testable.
 */
authRouter.post('/forgot-password', forgotLimiter, dbGuard, async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body ?? {});
  const generic = {
    ok: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  };

  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', message: validationMessage(parsed.error) });
    return;
  }

  const normalisedEmail = normaliseEmail(parsed.data.email);

  try {
    const rows = await query<{ id: number }>('SELECT id FROM users WHERE lower(email) = $1', [normalisedEmail]);
    const user = rows[0];

    if (user) {
      const token = await issuePasswordResetToken(user.id);
      const resetUrl = `${appOrigin(req)}/login?token=${encodeURIComponent(token)}`;
      console.log(`[api/auth/forgot-password] reset link for ${normalisedEmail}: ${resetUrl}`);

      if (process.env.NODE_ENV !== 'production') {
        res.json({ ...generic, devResetUrl: resetUrl });
        return;
      }
    }

    res.json(generic);
  } catch (error) {
    console.error('[api/auth/forgot-password]', error);
    // Do not let an internal failure become an account-existence signal.
    res.json(generic);
  }
});

authRouter.post('/reset-password', resetLimiter, dbGuard, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', message: validationMessage(parsed.error) });
    return;
  }

  try {
    const updated = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!updated) {
      res.status(400).json({
        error: 'INVALID_TOKEN',
        message: 'This reset link is invalid or has expired. Request a new one.',
      });
      return;
    }
    res.json({ ok: true, message: 'Password updated. Sign in with the new password.' });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      res.status(503).json({ error: 'DB_DISABLED', message: 'Accounts are unavailable right now.' });
      return;
    }
    console.error('[api/auth/reset-password]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not reset the password.' });
  }
});

authRouter.get('/me', dbGuard, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({ error: 'NOT_AUTHENTICATED', message: 'No active session.' });
      return;
    }
    sendUser(res, user);
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      res.status(503).json({ error: 'DB_DISABLED', message: 'Accounts are unavailable right now.' });
      return;
    }
    console.error('[api/auth/me]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not read the session.' });
  }
});

authRouter.patch('/me', dbGuard, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({ error: 'NOT_AUTHENTICATED', message: 'No active session.' });
      return;
    }
    const { name, village, username } = (req.body ?? {}) as { name?: string; village?: string; username?: string };
    if (typeof name !== 'undefined' && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({ error: 'BAD_NAME', message: 'Enter a valid name.' });
      return;
    }
    if (typeof username !== 'undefined') {
      if (typeof username !== 'string' || !/^[a-z0-9_-]+$/i.test(username.trim())) {
        res.status(400).json({ error: 'BAD_USERNAME', message: 'Username may only contain letters, numbers, underscores and hyphens.' });
        return;
      }
    }
    try {
      const rows = await query<SessionUser>(
        'UPDATE users SET name = COALESCE($1, name), village = COALESCE($2, village), username = COALESCE($3, username) WHERE id = $4 RETURNING id, email, username, customer_code AS "customerCode", name, role, village',
        [typeof name === 'string' ? name.trim() : null, typeof village === 'string' ? village.trim() : null, typeof username === 'string' ? username.trim() : null, user.id]
      );
      sendUser(res, rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: 'USERNAME_TAKEN', message: 'That username is already taken. Choose another.' });
        return;
      }
      console.error('[api/auth/me PATCH]', error);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the profile.' });
    }
  } catch (error) {
    console.error('[api/auth/me PATCH]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the profile.' });
  }
});

/** Postgres unique violation. Matches SQLSTATE 23505. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

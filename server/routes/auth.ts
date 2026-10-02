import { Router, type Request, type Response } from 'express';
import { isDbConfigured, query, DbUnavailableError } from '../db';
import {
  hashPassword,
  verifyPassword,
  signSession,
  clearSessionCookie,
  setSessionCookie,
  currentUser,
  type SessionUser,
} from '../auth';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

/** Never echo which part of the credentials was wrong. */
function unauthorized(res: Response): void {
  res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
}

function sendUser(res: Response, user: SessionUser): void {
  res.json({ user });
}

authRouter.post('/register', dbGuard, async (req, res) => {
  const { email, password, name, village } = (req.body ?? {}) as {
    email?: string;
    password?: string;
    name?: string;
    village?: string;
  };

  const normalisedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!EMAIL_RE.test(normalisedEmail)) {
    res.status(400).json({ error: 'BAD_EMAIL', message: 'Enter a valid email address.' });
    return;
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    res
      .status(400)
      .json({ error: 'WEAK_PASSWORD', message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    return;
  }
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'BAD_NAME', message: 'Enter your name.' });
    return;
  }

  try {
    // Role is hard-coded to 'customer'. A client can never request 'admin'.
    const rows = await query<SessionUser>(
      `INSERT INTO users (email, password_hash, name, role, village)
       VALUES ($1, $2, $3, 'customer', $4)
       RETURNING id, email, name, role, village`,
      [normalisedEmail, await hashPassword(password), name.trim(), typeof village === 'string' ? village.trim() || null : null]
    );

    const user = rows[0];
    setSessionCookie(res, signSession(user));
    sendUser(res, user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'EMAIL_TAKEN', message: 'An account with that email already exists.' });
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

authRouter.post('/login', dbGuard, async (req, res) => {
  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
  const normalisedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalisedEmail || typeof password !== 'string' || !password) {
    unauthorized(res);
    return;
  }

  try {
    const rows = await query<SessionUser & { password_hash: string }>(
      'SELECT id, email, name, role, village, password_hash FROM users WHERE lower(email) = $1',
      [normalisedEmail]
    );

    const user = rows[0];
    // Hash even when the user is missing so timing does not reveal whether the
    // email exists.
    const passwordMatches = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, 'deadbeef:deadbeef');

    if (!user || !passwordMatches) {
      unauthorized(res);
      return;
    }

    const { password_hash: _discarded, ...safeUser } = user;
    setSessionCookie(res, signSession(safeUser));
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

/** Postgres unique violation. Matches SQLSTATE 23505. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}
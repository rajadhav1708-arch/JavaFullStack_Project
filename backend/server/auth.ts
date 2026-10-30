import './env';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { DbUnavailableError, pool, query } from './db';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SESSION_COOKIE = 'pashufeed_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionUser {
  id: number;
  email: string;
  customerCode: string;
  name: string;
  role: 'customer' | 'admin' | 'employee';
  village: string | null;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short. Add one to .env (see .env.example).');
  }
  return secret;
}

/* ----------------------------- password hashing ---------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/* --------------------------------- tokens --------------------------------- */

export function signSession(user: SessionUser, sessionVersion = 0): string {
  return jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role, ver: sessionVersion },
    sessionSecret(),
    { expiresIn: SESSION_TTL_SECONDS }
  );
}

export function readSessionToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}

/** Returns the token payload, or null when absent, malformed or expired. */
export function verifySessionToken(
  token: string
): { sub: string; email: string; role: SessionUser['role']; ver: number } | null {
  try {
    const payload = jwt.verify(token, sessionSecret());
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      email: String(payload.email),
      role: payload.role as SessionUser['role'],
      ver: typeof payload.ver === 'number' ? payload.ver : 0,
    };
  } catch {
    return null;
  }
}

/* -------------------------------- cookies --------------------------------- */

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Resolves the signed-in user from the request cookie. Never trusts a role sent
 * by the browser - the role in the JWT was minted from the database row.
 */
export async function currentUser(req: Request): Promise<SessionUser | null> {
  const token = readSessionToken(req);
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const rows = await query<SessionUser & { session_version: number }>(
    'SELECT id, email, customer_code AS "customerCode", name, role, village, session_version FROM users WHERE id = $1',
    [Number(payload.sub)]
  );
  const row = rows[0];
  if (!row) return null;

  // A password reset bumps session_version, which invalidates every cookie
  // minted before it — including one an attacker may have stolen.
  if (row.session_version !== payload.ver) return null;

  const { session_version: _discarded, ...user } = row;
  return user;
}

/* --------------------------- password reset tokens ------------------------- */

const RESET_TOKEN_TTL_MINUTES = 30;

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Issues a single-use token. Only its hash is persisted. */
export async function issuePasswordResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [userId, hashResetToken(token), String(RESET_TOKEN_TTL_MINUTES)]
  );
  return token;
}

/**
 * Consumes a reset token and updates the password in one transaction. Returns
 * false for an unknown, used or expired token.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  if (!pool) throw new DbUnavailableError();
  const tokenHash = hashResetToken(token);
  const passwordHash = await hashPassword(newPassword);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const found = await client.query<{ id: number; user_id: number }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [tokenHash]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }

    const row = found.rows[0];
    await client.query(
      'UPDATE users SET password_hash = $1, session_version = session_version + 1 WHERE id = $2',
      [passwordHash, row.user_id]
    );
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [row.id]);
    await client.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2 AND used_at IS NULL',
      [row.user_id, row.id]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
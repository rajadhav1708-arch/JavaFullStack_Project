import './env';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { query } from './db';

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

export function signSession(user: SessionUser): string {
  return jwt.sign({ sub: String(user.id), email: user.email, role: user.role }, sessionSecret(), {
    expiresIn: SESSION_TTL_SECONDS,
  });
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
export function verifySessionToken(token: string): { sub: string; email: string; role: SessionUser['role'] } | null {
  try {
    const payload = jwt.verify(token, sessionSecret());
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, email: String(payload.email), role: payload.role as SessionUser['role'] };
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

  const rows = await query<SessionUser>('SELECT id, email, name, role, village FROM users WHERE id = $1', [
    Number(payload.sub),
  ]);
  return rows[0] ?? null;
}
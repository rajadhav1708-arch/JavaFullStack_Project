import './env';
import { Pool, type QueryResultRow } from 'pg';

const rawConnectionString = process.env.DATABASE_URL;

/**
 * pg 8.23 treats `sslmode=require` as `verify-full`, which rejects the cert
 * chain used by some managed providers (Supabase pooler included). Strip the
 * parameter and pass an explicit non-verifying TLS config instead. The traffic
 * is still encrypted; only certificate pinning is skipped, which is the same
 * trust model as libpq's historical `require`.
 */
function parseConnectionString(raw: string): {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
} {
  const wantsSsl =
    /sslmode=(require|prefer|verify-ca|verify-full)/i.test(raw) ||
    /(supabase\.(co|com)|neon\.tech|render\.com|pooler\.)/i.test(raw);

  try {
    const url = new URL(raw);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('uselibpqcompat');
    url.searchParams.delete('pgbouncer');
    return {
      connectionString: url.toString(),
      ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  } catch {
    return {
      connectionString: raw,
      ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  }
}

const parsed = rawConnectionString ? parseConnectionString(rawConnectionString) : null;

/**
 * The app runs without a database. `pool` stays null when DATABASE_URL is unset
 * so read-only features (storefront, AI ration quiz, chatbot) keep working and
 * only the auth endpoints report 503.
 */
export const isDbConfigured = Boolean(rawConnectionString);

export const pool = parsed
  ? new Pool({
      connectionString: parsed.connectionString,
      max: 5,
      ...(parsed.ssl ? { ssl: parsed.ssl } : {}),
    })
  : null;

pool?.on('error', (error) => {
  console.error('[db] idle client error:', error.message);
});

export class DbUnavailableError extends Error {
  constructor() {
    super('DATABASE_NOT_CONFIGURED');
    this.name = 'DbUnavailableError';
  }
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!pool) throw new DbUnavailableError();
  const result = await pool.query<T>(text, params as never[]);
  return result.rows;
}

/** Used by /api/health so the UI can tell "no DB configured" from "DB is down". */
export async function checkDb(): Promise<'ok' | 'error' | 'unconfigured'> {
  if (!pool) return 'unconfigured';
  try {
    await pool.query('SELECT 1');
    return 'ok';
  } catch (error) {
    console.error('[db] health check failed:', error instanceof Error ? error.message : error);
    return 'error';
  }
}
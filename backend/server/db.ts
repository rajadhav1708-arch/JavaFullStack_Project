import './env';
import { Pool, type QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

/**
 * The app runs without a database. `pool` stays null when DATABASE_URL is unset
 * so read-only features (storefront, AI ration quiz, chatbot) keep working and
 * only the auth endpoints report 503.
 */
export const isDbConfigured = Boolean(connectionString);

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 5,
      // Managed Postgres (Neon, Supabase, Render) requires TLS. Local Docker
      // Postgres has no TLS, so only negotiate when the URL asks for it.
      ...(connectionString.includes('sslmode=require') ? { ssl: { rejectUnauthorized: false } } : {}),
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
  } catch {
    return 'error';
  }
}
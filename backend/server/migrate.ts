import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDbConfigured, pool } from './db';

const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

async function main(): Promise<void> {
  if (!isDbConfigured) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and add it.');
    process.exitCode = 1;
    return;
  }

  const sql = await fs.readFile(schemaPath, 'utf8');
  await pool!.query(sql);
  console.log('Schema applied. Tables ready:');
  const { rows } = await pool!.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  for (const row of rows) console.log(`  - ${row.table_name}`);
}

main()
  .catch((error) => {
    console.error('db:init failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool?.end());
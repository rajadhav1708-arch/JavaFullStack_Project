import { isDbConfigured, pool, query } from './db';
import { hashPassword, type SessionUser } from './auth';

/**
 * Creates the demo accounts so there is always an admin to sign in as, plus one
 * of each other role so role-based differences are visible without editing the
 * database. Existing rows are updated in place, so re-running is safe.
 */
const DEMO_USERS: { email: string; password: string; name: string; role: SessionUser['role']; village: string }[] = [
  {
    email: 'admin@pashufeed.test',
    password: 'Admin@12345',
    name: 'Ramesh Patil',
    role: 'admin',
    village: 'Kagal, Kolhapur',
  },
  {
    email: 'counter@pashufeed.test',
    password: 'Counter@12345',
    name: 'Vikas More',
    role: 'employee',
    village: 'Kagal, Kolhapur',
  },
  {
    email: 'farmer@pashufeed.test',
    password: 'Farmer@12345',
    name: 'Sunita Jadhav',
    role: 'customer',
    village: 'Hesheri, Kolhapur',
  },
];

async function main(): Promise<void> {
  if (!isDbConfigured) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and add it.');
    process.exitCode = 1;
    return;
  }

  console.log('Seeding demo accounts:\n');

  for (const user of DEMO_USERS) {
    const rows = await query<SessionUser>(
      `INSERT INTO users (email, password_hash, name, role, village)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             village = EXCLUDED.village
       RETURNING id, email, name, role, village`,
      [user.email, await hashPassword(user.password), user.name, user.role, user.village]
    );
    console.log(`  ${rows[0].role.padEnd(8)} ${rows[0].email.padEnd(26)} password: ${user.password}`);
  }

  const { rows: counts } = await pool!.query<{ count: string }>('SELECT count(*) FROM users');
  console.log(`\nDone. ${counts[0].count} user(s) in the database.`);
}

main()
  .catch((error) => {
    console.error('db:seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool?.end());
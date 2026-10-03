import { isDbConfigured, pool, query } from './db';
import { hashPassword, type SessionUser } from './auth';
import { CATEGORY_SEED, PRODUCT_SEED } from './seed/catalogue';

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
    email: 'farmer@pashufeed.test',
    password: 'Farmer@12345',
    name: 'Sunita Jadhav',
    role: 'customer',
    village: 'Hesheri, Kolhapur',
  },
];

/**
 * Upserts the catalogue so `npm run db:seed` is safe to re-run. Categories load
 * in a single round trip; products and their pack sizes take one each because
 * the set is small and each row carries a different set of columns.
 */
async function seedCatalogue(): Promise<void> {
  await query(
    `INSERT INTO categories (id, name, description, image, sort_order)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       image = EXCLUDED.image,
       sort_order = EXCLUDED.sort_order`,
    [
      CATEGORY_SEED.map((c) => c.id),
      CATEGORY_SEED.map((c) => c.name),
      CATEGORY_SEED.map((c) => c.description),
      CATEGORY_SEED.map((c) => c.image),
      CATEGORY_SEED.map((_, i) => i),
    ]
  );
  for (const p of PRODUCT_SEED) {
    await query(
      `INSERT INTO products (
         id, name, brand, category_id, description, suitable_for, nutritional_info,
         ingredients, feeding_instructions, benefits, image, price, original_price,
         discount_percent, default_weight_kg, rating, review_count, stock_count, min_stock_level,
         sku, batch_number, expiry_date, is_best_seller, is_recommended
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         brand = EXCLUDED.brand,
         category_id = EXCLUDED.category_id,
         description = EXCLUDED.description,
         suitable_for = EXCLUDED.suitable_for,
         nutritional_info = EXCLUDED.nutritional_info,
         ingredients = EXCLUDED.ingredients,
         feeding_instructions = EXCLUDED.feeding_instructions,
         benefits = EXCLUDED.benefits,
         image = EXCLUDED.image,
         price = EXCLUDED.price,
         original_price = EXCLUDED.original_price,
         discount_percent = EXCLUDED.discount_percent,
         default_weight_kg = EXCLUDED.default_weight_kg,
         rating = EXCLUDED.rating,
         review_count = EXCLUDED.review_count,
         stock_count = EXCLUDED.stock_count,
         min_stock_level = EXCLUDED.min_stock_level,
         sku = EXCLUDED.sku,
         batch_number = EXCLUDED.batch_number,
         expiry_date = EXCLUDED.expiry_date,
         is_best_seller = EXCLUDED.is_best_seller,
         is_recommended = EXCLUDED.is_recommended`,
      [
        p.id, p.name, p.brand, p.category, p.description, p.suitableFor,
        JSON.stringify(p.nutritionalInfo), p.ingredients, p.feedingInstructions,
        p.benefits, p.image, p.price, p.originalPrice, p.discountPercent,
        p.selectedWeightKg, p.rating, p.reviewCount, p.stockCount, p.minStockLevel, p.sku,
        p.batchNumber, p.expiryDate, p.isBestSeller ?? false, p.isRecommended ?? false,
      ]
    );
  }

  for (const p of PRODUCT_SEED) {
    await query(
      `INSERT INTO product_variants (product_id, weight_kg, price, stock)
       SELECT $1, w.weight_kg, w.price, w.stock
       FROM unnest($2::numeric[], $3::numeric[], $4::int[])
         AS w(weight_kg, price, stock)
       ON CONFLICT (product_id, weight_kg) DO UPDATE
         SET price = EXCLUDED.price,
             stock = EXCLUDED.stock`,
      [p.id, p.weightOptions.map((v) => v.weightKg), p.weightOptions.map((v) => v.price), p.weightOptions.map((v) => v.stock)]
    );
  }

  console.log(`  catalogue: ${CATEGORY_SEED.length} categories, ${PRODUCT_SEED.length} products, ` +
    `${PRODUCT_SEED.reduce((n, p) => n + p.weightOptions.length, 0)} pack sizes`);
}

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

  console.log('');
  await seedCatalogue();

  const { rows: counts } = await pool!.query<{ count: string }>('SELECT count(*) FROM users');
  console.log(`\nDone. ${counts[0].count} user(s) in the database.`);
}

main()
  .catch((error) => {
    console.error('db:seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool?.end());

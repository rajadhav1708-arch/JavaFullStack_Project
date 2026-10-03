import { Router, type Request, type Response } from 'express';
import { isDbConfigured, query, DbUnavailableError } from '../db';
import type { NutritionalInfo, Product, ProductCategory } from '../../../frontend/src/types';

export const productsRouter = Router();

/**
 * Catalogue reads are public: browsing works without an account. Only writes
 * need a session, and those arrive with the orders feature.
 */
function dbGuard(_req: Request, res: Response, next: () => void): void {
  if (!isDbConfigured) {
    res.status(503).json({
      error: 'DB_DISABLED',
      message: 'DATABASE_URL is not set, so the catalogue is unavailable. See .env.example.',
    });
    return;
  }
  next();
}

/** Turns a DB failure into a clean 500 instead of an unhandled rejection. */
function fail(res: Response, error: unknown): void {
  if (error instanceof DbUnavailableError) {
    res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'The database could not be reached.' });
    return;
  }
  console.error('catalogue query failed:', error instanceof Error ? error.message : error);
  res.status(500).json({ error: 'QUERY_FAILED', message: 'Could not load the catalogue.' });
}

/**
 * Pack sizes are aggregated per product inside the same round trip. Doing this
 * with a second query per product would be an N+1: 8 products now, but the
 * catalogue grows.
 */
const VARIANTS_JSON = `
  COALESCE((
    SELECT json_agg(json_build_object(
      'weightKg', v.weight_kg,
      'price', v.price,
      'stock', v.stock
    ) ORDER BY v.weight_kg)
    FROM product_variants v
    WHERE v.product_id = p.id
  ), '[]'::json) AS variants
`;

/** Columns are aliased to the camelCase names the UI already uses. */
const PRODUCT_COLUMNS = `
  p.id, p.name, p.brand, p.category_id, p.description, p.suitable_for,
  p.nutritional_info, p.ingredients, p.feeding_instructions, p.benefits,
  p.image, p.price, p.original_price, p.discount_percent, p.rating,
  p.review_count, p.stock_count, p.min_stock_level, p.sku, p.batch_number,
  -- Cast to text on purpose. pg turns a DATE into a local-midnight Date, which
  -- JSON-serialises back a day earlier in any timezone ahead of UTC, so an
  -- expiry of 2027-02-01 would reach the browser as 2027-01-31.
  to_char(p.expiry_date, 'YYYY-MM-DD') AS expiry_date,
  p.is_best_seller, p.is_recommended, p.default_weight_kg,
  ${VARIANTS_JSON}
`;

interface ProductRow {
  id: string;
  name: string;
  brand: string;
  category_id: string;
  description: string;
  suitable_for: string[];
  nutritional_info: NutritionalInfo;
  ingredients: string[];
  feeding_instructions: string;
  benefits: string[];
  image: string | null;
  price: string;
  original_price: string;
  discount_percent: number;
  default_weight_kg: string | null;
  rating: string;
  review_count: number;
  stock_count: number;
  min_stock_level: number;
  sku: string;
  batch_number: string | null;
  expiry_date: string | null;
  is_best_seller: boolean;
  is_recommended: boolean;
  variants: { weightKg: number; price: number; stock: number }[];
}

/**
 * `inStock` and `selectedWeightKg` are derived here rather than stored: they
 * depend on the variant rows, so storing them would let them go stale. The
 * headline price is stored, though, so the "X% off" badge stays truthful.
 */
function toProduct(row: ProductRow): Product {
  const weightOptions = [...row.variants].sort((a, b) => a.weightKg - b.weightKg);
  const defaultVariant =
    weightOptions.find((v) => v.weightKg === Number(row.default_weight_kg)) ?? weightOptions[0];
  const inStock = weightOptions.some((v) => v.stock > 0);

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category_id as ProductCategory,
    suitableFor: row.suitable_for as Product['suitableFor'],
    description: row.description,
    nutritionalInfo: row.nutritional_info,
    ingredients: row.ingredients,
    feedingInstructions: row.feeding_instructions,
    benefits: row.benefits,
    weightOptions,
    selectedWeightKg: defaultVariant?.weightKg ?? 0,
    price: Number(row.price),
    originalPrice: Number(row.original_price),
    discountPercent: row.discount_percent,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    inStock,
    stockCount: row.stock_count,
    minStockLevel: row.min_stock_level,
    sku: row.sku,
    batchNumber: row.batch_number ?? '',
    expiryDate: row.expiry_date ?? '',
    image: row.image ?? '',
    isBestSeller: row.is_best_seller,
    isRecommended: row.is_recommended,
  };
}

productsRouter.get('/categories', dbGuard, async (_req, res) => {
  try {
    const rows = await query<{
      id: string;
      name: string;
      description: string | null;
      image: string | null;
      product_count: number;
    }>(
      `SELECT c.id, c.name, c.description, c.image, count(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id, c.name, c.description, c.image, c.sort_order
       ORDER BY c.sort_order, c.name`
    );

    // Counted in SQL, so a category can never advertise products it does not have.
    res.json({
      categories: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        image: r.image ?? '',
        productCount: r.product_count,
      })),
    });
  } catch (error) {
    fail(res, error);
  }
});

productsRouter.get('/products', dbGuard, async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : null;
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : null;
  const brand = typeof req.query.brand === 'string' ? req.query.brand : null;

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (category) {
    params.push(category);
    where.push(`p.category_id = $${params.length}`);
  }
  if (brand) {
    params.push(brand);
    where.push(`p.brand = $${params.length}`);
  }
  if (search) {
    // Parameterised on purpose: never interpolate user input into SQL.
    params.push(`%${search}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length}
                OR p.description ILIKE $${params.length})`);
  }

  try {
    const rows = await query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.is_best_seller DESC, p.rating DESC, p.name`,
      params
    );
    res.json({ products: rows.map(toProduct) });
  } catch (error) {
    fail(res, error);
  }
});

productsRouter.get('/products/:id', dbGuard, async (req, res) => {
  try {
    const rows = await query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       WHERE p.id = $1 OR lower(p.sku) = lower($1)`,
      [req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No product matches that id.' });
      return;
    }
    res.json({ product: toProduct(rows[0]) });
  } catch (error) {
    fail(res, error);
  }
});
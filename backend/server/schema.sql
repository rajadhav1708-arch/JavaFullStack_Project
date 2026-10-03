-- PashuFeed Pro schema.
-- Applied by `npm run db:init`. Safe to re-run: every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'admin', 'employee')),
  village       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive login: "A@b.com" and "a@b.com" must be the same account.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

-- ---------------------------------------------------------------- catalogue --
-- `id` is the stable public slug the UI already uses (e.g. 'prod-1'), kept as
-- TEXT so product references in carts and orders stay valid across deploys.
-- Money is NUMERIC, never float: 0.1 + 0.2 must not drift in a billing column.

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  image       TEXT,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  brand               TEXT NOT NULL,
  category_id         TEXT NOT NULL REFERENCES categories (id),
  description         TEXT NOT NULL DEFAULT '',
  suitable_for        TEXT[] NOT NULL DEFAULT '{}',
  -- Structured label/value pairs (crude protein, TDN, vitamins...).
  nutritional_info    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingredients         TEXT[] NOT NULL DEFAULT '{}',
  feeding_instructions TEXT NOT NULL DEFAULT '',
  benefits            TEXT[] NOT NULL DEFAULT '{}',
  image               TEXT,
  -- Headline price of the default pack. Stored rather than derived, because the
  -- displayed discount is computed against original_price and must stay truthful
  -- even while the default pack is temporarily out of stock.
  price               NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  original_price      NUMERIC(10, 2) NOT NULL CHECK (original_price >= 0),
  discount_percent    INT NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  -- Pack size shown first on the product page; the shop's chosen default.
  default_weight_kg   NUMERIC(8, 2),
  rating              NUMERIC(2, 1) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review_count        INT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  stock_count         INT NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  min_stock_level     INT NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  sku                 TEXT NOT NULL UNIQUE,
  batch_number        TEXT,
  expiry_date         DATE,
  is_best_seller      BOOLEAN NOT NULL DEFAULT false,
  is_recommended      BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products (brand);

-- Pack sizes (5 kg, 50 kg, 500 kg) carry their own price and stock, because a
-- 50 kg bag and a 5 kg pouch of the same feed are not the same line item.
CREATE TABLE IF NOT EXISTS product_variants (
  id         SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  weight_kg  NUMERIC(8, 2) NOT NULL CHECK (weight_kg > 0),
  price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock      INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  UNIQUE (product_id, weight_kg)
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants (product_id);

-- Columns added after the tables first shipped. CREATE TABLE IF NOT EXISTS is a
-- no-op on an existing table, so new columns need their own ALTER to reach
-- databases that were created by an earlier version of this file.
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_weight_kg NUMERIC(8, 2);

-- ------------------------------------------------------------------- orders --
CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  order_number    TEXT NOT NULL UNIQUE,
  user_id         INT NOT NULL REFERENCES users (id),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  customer_village TEXT NOT NULL,
  subtotal        NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  discount        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  delivery_charge NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  tax             NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total_amount    NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method  TEXT NOT NULL,
  payment_status  TEXT NOT NULL CHECK (payment_status IN ('Paid', 'Pending', 'Khata Due')),
  status          TEXT NOT NULL DEFAULT 'Placed'
                  CHECK (status IN ('Placed','Confirmed','Packed','Shipped','Out for Delivery','Delivered','Cancelled')),
  delivery_type   TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  estimated_delivery_date TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products (id),
  product_name TEXT NOT NULL,
  brand       TEXT NOT NULL,
  weight_kg   NUMERIC(8, 2) NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
  image       TEXT
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- ------------------------------------------------------- access audit log --
CREATE TABLE IF NOT EXISTS visits (
  id         SERIAL PRIMARY KEY,
  ip         TEXT NOT NULL,
  path       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visits_created_idx ON visits (created_at DESC);

CREATE TABLE IF NOT EXISTS blocked_ips (
  ip         TEXT PRIMARY KEY,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updated_at honest without relying on the application to remember.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_touch_updated_at ON products;
CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
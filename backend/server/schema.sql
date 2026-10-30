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

-- Bumped whenever the password changes. Sessions embed the version they were
-- minted with, so an old cookie stops working the moment a reset happens.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0;

-- One-time password reset tokens. Only the SHA-256 hash is stored: a leaked
-- database dump must not hand out working reset links.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id, created_at DESC);

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

-- Hardware, sprayers, wire, pipe fittings and milking machinery joined the
-- catalogue, so a pack size is no longer always a weight: `weight_kg` is now
-- only the numeric identity of a variant (a sprayer is 1, a coil of wire is
-- 25) and `unit` is what the label says. The column is not renamed because it
-- already carried litres and bale counts before this change.
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'kg';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'kg';

-- Descriptive tags for non-consumables. `suitable_for` stays animal-only, so
-- hardware gets an empty array plus tags rather than falsely claiming to be
-- for a cow.
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- The three feature bullets a product card shows above the price.
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlights TEXT[] NOT NULL DEFAULT '{}';

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
  -- Frozen from the variant at checkout so order history still renders the
  -- right label after a product is re-packed or withdrawn.
  unit        TEXT NOT NULL DEFAULT 'kg',
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
  image       TEXT
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- -------------------------------------------------------------------- khata --
-- The farmer credit ledger (khata). A village dairy shop lets a farmer take
-- feed on credit and settles against it from the milk-collection payment.

-- One row per farmer. The outstanding balance is NOT stored: it is the sum of
-- the entries below, so a payment can never be recorded without also reducing
-- what is owed. Storing a running balance would need every write path to keep
-- it in step, which is exactly how a ledger starts telling the wrong number.
CREATE TABLE IF NOT EXISTS khata_accounts (
  id                  SERIAL PRIMARY KEY,
  -- Linked to the account that buys on credit. NULL for a farmer who has a
  -- khata but has never signed in to the site.
  user_id             INT UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  customer_name       TEXT NOT NULL,
  phone               TEXT NOT NULL,
  village             TEXT NOT NULL DEFAULT '',
  -- Member number at the local milk union, used to reconcile against the
  -- cooperative's own payment list. NULL when the farmer has no membership.
  milk_union_member_id TEXT,
  -- Ceiling the shop has approved. 0 means no credit until the owner raises it.
  credit_limit        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  -- When the running balance is due. NULL means no agreed due date.
  due_date            DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only. Both purchases and payments are rows, so the ledger can be
-- reprinted in order and audited; nothing is ever edited in place.
CREATE TABLE IF NOT EXISTS khata_entries (
  id         SERIAL PRIMARY KEY,
  account_id INT NOT NULL REFERENCES khata_accounts (id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Purchase', 'Payment')),
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  notes      TEXT NOT NULL DEFAULT '',
  -- Set when the entry came from an order. ON DELETE SET NULL rather than
  -- CASCADE: cancelling an order must not erase the money the farmer owes.
  order_id   INT REFERENCES orders (id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A purchase is written once per order, inside the order's transaction. The
  -- unique index is what stops a retried checkout double-charging the farmer.
  CONSTRAINT khata_entries_purchase_per_order UNIQUE (order_id, entry_type)
);

CREATE INDEX IF NOT EXISTS khata_entries_account_idx ON khata_entries (account_id, entry_date DESC, id DESC);

-- ------------------------------------------------------------- access audit log --
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

DROP TRIGGER IF EXISTS khata_accounts_touch_updated_at ON khata_accounts;
CREATE TRIGGER khata_accounts_touch_updated_at
  BEFORE UPDATE ON khata_accounts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ------------------------------------------------ permanent customer IDs --
-- Every account gets a stable public ID like HT-CUS-10042 at registration.
-- The numeric `users.id` stays the internal key; customer_code is what the
-- shop quotes over the counter and what a farmer can log in with, so email is
-- no longer required (many rural customers do not have one).
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 10001;

ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_code TEXT;

-- Backfill any account created before this column existed. nextval() per row
-- guarantees uniqueness without a second pass.
UPDATE users
SET customer_code = 'HT-CUS-' || nextval('customer_code_seq')
WHERE customer_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_customer_code_key ON users (customer_code);

-- Email becomes optional. The old unique index stays: Postgres treats NULLs as
-- distinct in a unique index, so several email-less accounts coexist fine while
-- two accounts can never share the same address.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- ------------------------------------------------ khata approval workflow --
-- 'Pending'   — customer asked for credit, owner has not decided yet.
-- 'Approved'  — live credit account (what every account created before this
--               column existed becomes, because the shop had already agreed it).
-- 'Rejected'  — request refused; rejection_reason says why.
-- 'Suspended' — credit paused (late payment, moved away...); can be reactivated.
-- 'Closed'    — account wound up; terminal.
ALTER TABLE khata_accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Approved'
  CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Suspended', 'Closed'));
ALTER TABLE khata_accounts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE khata_accounts ADD COLUMN IF NOT EXISTS requested_limit NUMERIC(12, 2);
ALTER TABLE khata_accounts ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE khata_accounts ADD COLUMN IF NOT EXISTS decided_by INT REFERENCES users (id);

-- ------------------------------------------------- ledger entry extensions --
-- entry_type gains 'Adjustment': the auditable way to correct a mistaken
-- Purchase or Payment. The original row is never edited or deleted — a new
-- entry reverses it and points back with reverses_entry_id.
ALTER TABLE khata_entries DROP CONSTRAINT IF EXISTS khata_entries_entry_type_check;
ALTER TABLE khata_entries ADD CONSTRAINT khata_entries_entry_type_check
  CHECK (entry_type IN ('Purchase', 'Payment', 'Adjustment'));

-- is_debit: TRUE means the entry INCREASES what the farmer owes (a purchase, or
-- the reversal of a payment); FALSE decreases it (a payment, or the reversal of
-- a purchase). Outstanding = SUM(amount WHERE is_debit) - SUM(amount WHERE NOT).
ALTER TABLE khata_entries ADD COLUMN IF NOT EXISTS is_debit BOOLEAN;

UPDATE khata_entries SET is_debit = (entry_type = 'Purchase') WHERE is_debit IS NULL;
ALTER TABLE khata_entries ALTER COLUMN is_debit SET NOT NULL;

-- Who recorded it, and how the money moved. Both matter when the owner audits
-- "who wrote this row and was the cash actually received?".
ALTER TABLE khata_entries ADD COLUMN IF NOT EXISTS recorded_by INT REFERENCES users (id);
ALTER TABLE khata_entries ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Set on Adjustment rows: the entry being corrected. ON DELETE SET NULL keeps
-- the adjustment even if the original somehow disappears, and the UNIQUE
-- constraint stops a double-reversal of the same row.
ALTER TABLE khata_entries ADD COLUMN IF NOT EXISTS reverses_entry_id INT REFERENCES khata_entries (id);
CREATE UNIQUE INDEX IF NOT EXISTS khata_entries_one_reversal_per_entry
  ON khata_entries (reverses_entry_id) WHERE reverses_entry_id IS NOT NULL;

-- A cancelled order's reversal is also an Adjustment tied to the same order;
-- the existing (order_id, entry_type) unique constraint already allows exactly
-- one Purchase plus one Adjustment per order, which makes the cancellation
-- path idempotent.
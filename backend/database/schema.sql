-- Burney Boyz product catalog schema (Neon PostgreSQL, raw SQL - no ORM/migration tool).
-- Run manually against DATABASE_URL, e.g.:
--   psql "$DATABASE_URL" -f database/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── products ───────────────────────────────────────────────────────────────
-- One row per CJ product we've chosen to import. `price` is OUR selling price;
-- the CJ cost is not stored here (see product_variants for CJ-side per-variant
-- price/stock). profit_amount = price - CJ cost, kept for reporting.

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cj_product_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  compare_price NUMERIC(10,2),
  profit_amount NUMERIC(10,2),
  image TEXT,
  sku TEXT,
  category_id TEXT,
  category_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- ─── product_variants ───────────────────────────────────────────────────────
-- One row per CJ variant belonging to a product. `price` here is the CJ
-- variant price (cost); profit_amount is added on top to get our selling
-- price at read time - selling_price = price + profit_amount.

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cj_variant_id TEXT,
  name TEXT,
  sku TEXT,
  price NUMERIC(10,2),
  profit_amount NUMERIC(10,2),
  stock INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

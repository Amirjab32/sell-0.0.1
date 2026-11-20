-- Phase 1 Schema for Cloudflare D1 (SQLite)
-- Strictly separates public storefront columns from internal server-only pricing columns.

CREATE TABLE IF NOT EXISTS products (
  -- Public storefront columns
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  gallery_images_json TEXT DEFAULT '[]',
  specs_json TEXT DEFAULT '[]',
  description TEXT DEFAULT '',
  price_toman INTEGER NOT NULL DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'call')),
  warranty TEXT DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,

  -- Internal server-only columns (NEVER returned to frontend or public APIs)
  source_url TEXT DEFAULT '',
  reference_price_toman INTEGER NOT NULL DEFAULT 0,
  margin_percent REAL NOT NULL DEFAULT 0,
  manual_price_lock INTEGER NOT NULL DEFAULT 0
);

-- Essential indexes for catalog filtering, sorting, and lookup
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible);
CREATE INDEX IF NOT EXISTS idx_products_price_toman ON products(price_toman);

-- Sync execution audit log
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  synced_at TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 0,
  upserted_count INTEGER NOT NULL DEFAULT 0,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  message TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at ON sync_logs(synced_at DESC);

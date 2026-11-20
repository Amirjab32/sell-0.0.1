-- Hero Banner Carousel table for admin-managed storefront banners
-- Stores uploaded/optimized banner images or URLs and no-code navigation targets.

CREATE TABLE IF NOT EXISTS hero_banners (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'none' CHECK (target_type IN ('none', 'category', 'brand', 'search', 'product', 'url')),
  target_value TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hero_banners_active_order ON hero_banners(is_active, sort_order ASC, created_at DESC);

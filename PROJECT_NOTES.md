# PROJECT_NOTES.md

## Overview
- **Project**: "اگزو تک" — specialized Persian RTL (`dir="rtl"`, `lang="fa"`, Vazirmatn) hardware, gaming laptop & peripherals storefront ("سایت دوم"), inspired by Exo Gaming.
- **Role**: Public customer storefront paired with an external internal pricing system ("سایت اول") via protected server-to-server sync, plus a private admin banner manager.
- **Target Hosting**: Cloudflare Workers with Assets (`wrangler.json`) + Cloudflare D1 (`DB`), zero R2 or credit-card-required dependencies.
- **Local Dev Simulation**: Express (`server.ts`, 5MB JSON limit for banner uploads) on port 3000 with Vite middleware and Node 22 `node:sqlite` (`LocalD1Database`) mirroring Cloudflare D1.

## Database Schema (`migrations/0001_init.sql`, `migrations/0002_hero_banners.sql`)
- `products`:
  - Public columns: `id`, `slug`, `name`, `brand`, `category`, `image_url`, `gallery_images_json`, `specs_json`, `description`, `price_toman`, `stock_status` (`in_stock` | `out_of_stock` | `call`), `warranty`, `is_featured`, `is_visible`, `updated_at`, `created_at`.
  - Server-only columns (never returned to frontend/public APIs): `source_url`, `reference_price_toman`, `margin_percent`, `manual_price_lock`.
  - Indexes: `slug`, `category`, `brand`, `stock_status`, `is_visible`, `price_toman`.
- `sync_logs`: `id`, `synced_at`, `source_count`, `upserted_count`, `deleted_count`, `status`, `message`.
- `hero_banners`: `id`, `title`, `image_url` (URL, local `/images/...`, or D1-safe base64 data URI), `target_type` (`none` | `category` | `brand` | `search` | `product` | `url`), `target_value`, `sort_order`, `is_active`, `created_at`, `updated_at`.

## Backend & Cloudflare Worker (`server/`, `worker/index.ts`, `server.ts`)
- `server/db-types.ts`: Portable `D1DatabaseLike` interface shared by Cloudflare D1 and `server/d1-local.ts` (`node:sqlite`).
- `server/auth.ts`: Constant-time UTF-8 comparison (`constantTimeEqual`) checking `Authorization: Bearer` or `X-Admin-Sync-Token` against `ADMIN_SYNC_TOKEN` (503 if unset, 401 if invalid/missing).
- `server/catalog.ts`: Public queries using explicit `PUBLIC_PRODUCT_COLUMNS` allow-list & `is_visible = 1` filter; supports search, category, brand, stock filter, price range, sorting, pagination, facets, and `lastSyncedAt`.
- `server/banners.ts`: Public active banner listing (`listPublicBanners`), binary image streaming (`getBannerImagePayload` via `/api/banners/image/:id`), and admin CRUD/reorder (`listAdminBanners`, `createAdminBanner`, `updateAdminBanner` preserving existing uploaded binary when metadata-only edited, `deleteAdminBanner`, `reorderAdminBanners`).
- `server/sync.ts`: Pulls from `SOURCE_CATALOG_URL` or accepts admin JSON payload; strips confidential Site 1 fields; preserves enriched storefront columns and `manual_price_lock = 1`; executes small `db.batch(...)` chunks; records `sync_logs`.
- `server/api.ts`: Unified Web `Request -> Response` handler with CORS (`GET, POST, PUT, DELETE, OPTIONS`) for `/api/health`, `/api/catalog`, `/api/products`, `/api/banners`, `/api/banners/image/:id`, `POST /api/sync/import-from-source`, and `ADMIN_SYNC_TOKEN`-protected `/api/admin/verify`, `/api/admin/banners`, `/api/admin/banners/reorder`, `/api/admin/banners/:id`.
- `worker/index.ts`: Forwards non-`/api/` routes to `env.ASSETS.fetch(request)`; routes `/api/*` to `handleApiRequest`.
- `server/dev-seed.ts`: Seeds 12 sample hardware items and 3 sample hero banners ONLY when `APP_ENV !== 'production'` and respective tables are empty.

## Frontend (`src/`)
- `src/types/catalog.ts`, `src/lib/format.ts`, `src/lib/image.ts`, `src/lib/categories.ts`: Shared DTOs (including `PublicBanner`, `AdminBanner`, `BannerTargetType`), Persian Toman/Jalali formatters, light-neutral SVG fallback, and 6-category mega-menu data.
- `src/index.css`: Light `#FAFAFA` canvas, `#18181B` text, `Vazirmatn` typography, `overflow-x: clip`, minimal 5px root scrollbar, `.mini-scrollbar`, `.no-scrollbar`.
- `src/App.tsx`: SPA routing (`/`, `/product/:slug`, and hidden owner-only `/admin` with zero storefront links), URL search-param hydration (`category`, `brand`, `q`, `onlyAvailable`, `sort`, `action=consultation`), debounced search, right sidebar + 3-col catalog grid, active filter chips, pagination, and modals.
- `src/components/`: `Header.tsx`, `HeroBannerSlider.tsx` (full-width rounded `exo.ir`-style carousel with 5s auto-advance, pause on hover/focus, swipe support, bottom dash indicators, and target routing), `AdminBannerManager.tsx` (password-protected `/admin` panel with canvas image optimizer, URL/upload modes, no-code target selectors & site-page presets, reorder, toggle, delete), `FilterSidebar.tsx`, `SortToolbar.tsx`, `ProductCard.tsx`, `ProductImage.tsx`, `ProductDetailPage.tsx`, `Modals.tsx`, `States.tsx`, `Footer.tsx`.
- `public/images/*.svg`: Local hardware & banner vector illustrations for dev seed items.

## Verification Status
- Run `compile_applet`, `lint_applet`, and `npx tsx --test src/lib/format.test.ts server/sync-and-api.test.ts` after banner feature wiring.

# PROJECT_NOTES.md

## Overview
- **Project**: Phase 1 of "اگزو تک" — specialized Persian RTL (`dir="rtl"`, `lang="fa"`, Vazirmatn) hardware, gaming laptop & peripherals storefront ("سایت دوم"), inspired by Exo Gaming.
- **Role**: Public customer storefront paired with an external internal pricing system ("سایت اول") via protected server-to-server sync.
- **Target Hosting**: Cloudflare Workers with Assets (`wrangler.json`) + Cloudflare D1 (`DB`), zero R2 or credit-card-required dependencies.
- **Local Dev Simulation**: Express (`server.ts`) on port 3000 with Vite middleware and Node 22 `node:sqlite` (`LocalD1Database`) mirroring Cloudflare D1.

## Database Schema (`migrations/0001_init.sql`)
- `products`:
  - Public columns: `id`, `slug`, `name`, `brand`, `category`, `image_url`, `gallery_images_json`, `specs_json`, `description`, `price_toman`, `stock_status` (`in_stock` | `out_of_stock` | `call`), `warranty`, `is_featured`, `is_visible`, `updated_at`, `created_at`.
  - Server-only columns (never returned to frontend/public APIs): `source_url`, `reference_price_toman`, `margin_percent`, `manual_price_lock`.
  - Indexes: `slug`, `category`, `brand`, `stock_status`, `is_visible`, `price_toman`.
- `sync_logs`: `id`, `synced_at`, `source_count`, `upserted_count`, `deleted_count`, `status`, `message`.

## Backend & Cloudflare Worker (`server/`, `worker/index.ts`, `server.ts`)
- `server/db-types.ts`: Portable `D1DatabaseLike` interface shared by Cloudflare D1 and `server/d1-local.ts` (`node:sqlite`).
- `server/auth.ts`: Constant-time UTF-8 comparison (`constantTimeEqual`) checking `Authorization: Bearer` or `X-Admin-Sync-Token` against `ADMIN_SYNC_TOKEN` (503 if unset, 401 if invalid/missing).
- `server/catalog.ts`: Public queries using explicit `PUBLIC_PRODUCT_COLUMNS` allow-list & `is_visible = 1` filter; supports search, category, brand, stock filter, price range, sorting (`in_stock_first`, `cheapest`, `expensive`, `newest`), pagination, facets, and `lastSyncedAt`.
- `server/sync.ts`: Pulls from `SOURCE_CATALOG_URL` (with `SOURCE_CATALOG_TOKEN` in `X-Sync-Secret` & `Authorization: Bearer`) or accepts admin JSON payload fallback; maps `sourceUrl`, `currentPriceToman`, `marginPercent`, `customerQuoteToman`; strips confidential Site 1 fields (`shopCostToman`, `notes`, `barcodes`, `lastPriceToman`, `histories`); preserves storefront columns (`slug`, `brand`, `gallery_images_json`, `specs_json`, `description`, `is_featured`, `is_visible`, `manual_price_lock`) on update and locks `price_toman` when `manual_price_lock = 1`; supports `deletedIds` & `mode: 'replace' | 'merge'`; executes small `db.batch(...)` chunks (25 statements); records `sync_logs`.
- `server/api.ts`: Unified Web `Request -> Response` handler with CORS (`GET, POST, OPTIONS`) for `/api/health`, `/api/catalog`, `/api/products`, `/api/catalog/:idOrSlug`, `/api/products/:idOrSlug`, and `POST /api/sync/import-from-source`.
- `worker/index.ts`: Defensively forwards non-`/api/` routes to `env.ASSETS.fetch(request)`; routes `/api/*` to `handleApiRequest`.
- `server/dev-seed.ts`: Seeds 12 sample hardware items ONLY when `APP_ENV !== 'production'` and `products` is empty.

## Frontend (`src/`)
- `src/types/catalog.ts`, `src/lib/format.ts`, `src/lib/image.ts`, `src/lib/categories.ts`: Shared DTOs, Persian Toman/Jalali formatters (`formatToman`, `formatTomanParts`), light-neutral `DEFAULT_PRODUCT_PLACEHOLDER_SVG`, and 6-category hardware mega-menu data.
- `src/index.css`: Light `#F8FAFC` canvas, `#0F172A` text, `Vazirmatn` typography, `overflow-x: clip`, minimal 5px trackless/buttonless root scrollbar, `.mini-scrollbar` (3px ultra-fine vertical lists), and `.no-scrollbar` (horizontal strips).
- `src/App.tsx`: SPA routing (`/` and `/product/:slug`), debounced search, right sidebar + 3-col catalog grid layout, active filter chips, pagination, and modals.
- `src/components/`: `Header.tsx` (`#0F172A` top bar with live instant-results search dropdown + `#FFFFFF` category strip & organized mega-menu + mobile drawer), `HeroFeatured.tsx` (compact intro bar + single featured spotlight card), `FilterSidebar.tsx` (desktop accordion sidebar + mobile slide-over drawer), `SortToolbar.tsx` (tabbed sort + result count + removable active filter chips), `ProductCard.tsx` (pure white `#FFFFFF` square-image cards with bottom-aligned Toman price), `ProductImage.tsx` (`referrerPolicy="no-referrer"` + light SVG fallback), `ProductDetailPage.tsx` (breadcrumb + 3-col PDP with gallery, highlights, zebra specs table, sticky purchase box with 3 trust notes, related products), `Modals.tsx`, `States.tsx` (skeleton, empty filter / initial-sync guide, error retry), `Footer.tsx` (`#0F172A` with `lastSyncedAt`).
- `public/images/*.svg`: Local hardware vector illustrations for dev seed items.
- Config & docs: `wrangler.json`, `.env.example`, `CLOUDFLARE_DEPLOY.md`, `index.html`, `metadata.json`.

## Verification Status
- `npx tsc --noEmit` & `npm run build` (`vite build`): verified after UI upgrade.
- `npx tsx --test src/lib/format.test.ts server/sync-and-api.test.ts`: unit & API tests passing.

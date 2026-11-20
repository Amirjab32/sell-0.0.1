# PROJECT_NOTES.md

## Overview
- **Project**: "اگزو تک" — specialized Persian RTL (`dir="rtl"`, `lang="fa"`, Vazirmatn) hardware, gaming laptop & peripherals storefront ("سایت دوم"), inspired by Exo Gaming.
- **Role**: Public customer storefront paired with an external internal pricing system ("سایت اول") via protected server-to-server sync, plus a private admin banner manager.
- **Target Hosting**: Cloudflare Workers with Assets (`wrangler.json`) + Cloudflare D1 (`DB`), zero R2 or credit-card-required dependencies.
- **Local Dev Simulation**: Express (`server.ts`, 5MB JSON limit for banner uploads) on port 3000 with Vite middleware and Node 22 `node:sqlite` (`LocalD1Database`) mirroring Cloudflare D1.

## Database Schema (`migrations/0001_init.sql`, `0002_hero_banners.sql`, `0003_admin_auth.sql`)
- `products`: Public columns (`id`, `slug`, `name`, `brand`, `category`, `image_url`, `gallery_images_json`, `specs_json`, `description`, `price_toman`, `stock_status`, `warranty`, `is_featured`, `is_visible`, `updated_at`, `created_at`) + server-only columns (`source_url`, `reference_price_toman`, `margin_percent`, `manual_price_lock`).
- `sync_logs`: `id`, `synced_at`, `source_count`, `upserted_count`, `deleted_count`, `status`, `message`.
- `hero_banners`: `id`, `title`, `image_url`, `target_type` (`none` | `category` | `brand` | `search` | `product` | `url`), `target_value`, `sort_order`, `is_active`, `created_at`, `updated_at`.
- `admin_credentials`: `id` (`'primary'`), `password_hash` (PBKDF2-SHA256, 100k iterations), `salt` (16-byte random hex), `iterations`, `failed_attempts`, `locked_until` (5 failures -> 15m lock), `created_at`, `updated_at`.
- `admin_sessions`: `token_hash` (SHA-256 of 256-bit random session token), `created_at`, `expires_at` (12h TTL).

## Backend & Cloudflare Worker (`server/`, `worker/index.ts`, `server.ts`)
- `server/db-types.ts`: Portable `D1DatabaseLike` interface shared by Cloudflare D1 and `server/d1-local.ts` (`node:sqlite`).
- `server/auth.ts`: Constant-time UTF-8 comparison (`constantTimeEqual`) checking `ADMIN_SYNC_TOKEN` for Site 1 catalog sync.
- `server/admin-auth.ts`: Web Crypto PBKDF2-SHA256 first-login password setup (`INSERT OR IGNORE` so setup cannot be overwritten), brute-force lockout, password rotation, hashed session tokens (`X-Admin-Session`), logout revocation, and `verifyAdminAccess` (accepts valid DB session OR `ADMIN_SYNC_TOKEN`).
- `server/catalog.ts`: Public catalog queries using `PUBLIC_PRODUCT_COLUMNS` allow-list & `is_visible = 1`.
- `server/banners.ts`: Public active banners, binary image streaming (`/api/banners/image/:id`), and admin banner CRUD/reorder.
- `server/sync.ts`: Syncs catalog from `SOURCE_CATALOG_URL` or JSON payload, stripping confidential Site 1 fields.
- `server/api.ts`: Unified Web `Request -> Response` handler with CORS (`X-Admin-Session`, `X-Admin-Sync-Token`) for catalog, banners, `/api/admin/auth-status`, `/api/admin/setup-password`, `/api/admin/login`, `/api/admin/logout`, `/api/admin/change-password`, and protected `/api/admin/banners*`.
- `worker/index.ts`: Forwards non-`/api/` routes to `env.ASSETS.fetch(request)`; routes `/api/*` to `handleApiRequest`.
- `server/dev-seed.ts`: Seeds 12 sample products and 3 sample hero banners in local dev only.

## Frontend (`src/`)
- `src/types/catalog.ts`, `src/lib/format.ts`, `src/lib/image.ts`, `src/lib/categories.ts`: Shared DTOs, Persian formatters, SVG fallback, and 6-category mega-menu data.
- `src/index.css`: Light `#FAFAFA` canvas, `#18181B` text, `Vazirmatn`, `overflow-x: clip`, minimal scrollbars.
- `src/App.tsx`: SPA routing (`/`, `/product/:slug`, and hidden unlinked `/aدmin` supporting percent-encoded URLs), URL query hydration (`category`, `brand`, `q`, `onlyAvailable`, `sort`, `action=consultation`), catalog grid, modals.
- `src/components/`: `Header.tsx`, `HeroBannerSlider.tsx` (5s auto-advance, dash indicators, swipe), `AdminBannerManager.tsx` (first-login password setup on `/aدmin`, PBKDF2 login, change password, logout, canvas image optimizer, no-code target links), `FilterSidebar.tsx`, `SortToolbar.tsx`, `ProductCard.tsx`, `ProductImage.tsx`, `ProductDetailPage.tsx`, `Modals.tsx`, `States.tsx`, `Footer.tsx`.

## Verification Status
- Run `compile_applet`, `lint_applet`, and `npx tsx --test src/lib/format.test.ts server/sync-and-api.test.ts`.

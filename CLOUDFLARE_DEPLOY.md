# راهنمای ساخت دیتابیس D1 و استقرار روی پلن رایگان کلادفلر (فاز ۱)

این پروژه روی **Cloudflare Workers with Assets** و **Cloudflare D1** بدون نیاز به R2 یا کارت بانکی اجرا می‌شود.

## ۱. احراز هویت و ساخت پایگاه داده D1
```bash
npx wrangler login
npx wrangler d1 create exo_tech_storefront_db
```
مقدار `database_id` نمایش‌داده‌شده در خروجی را داخل فایل `wrangler.json` جایگزین `REPLACE_WITH_YOUR_D1_DATABASE_ID` کنید.

## ۲. اجرای فایل مهاجرت پایگاه داده (Migration)
```bash
# اجرای مهاجرت روی D1 ابری
npx wrangler d1 migrations apply exo_tech_storefront_db --remote

# (اختیاری) تست مهاجرت روی D1 شبیه‌سازی‌شده محلی
npx wrangler d1 migrations apply exo_tech_storefront_db --local
```

## ۳. تنظیم سکرت‌های امنیتی روی کلادفلر (Secrets)
هرگز این مقادیر را داخل `wrangler.json` یا فایل‌های فرانت‌اند قرار ندهید:
```bash
npx wrangler secret put ADMIN_SYNC_TOKEN
npx wrangler secret put SOURCE_CATALOG_URL
npx wrangler secret put SOURCE_CATALOG_TOKEN
```

## ۴. بیلد و استقرار نهایی (Deploy)
```bash
npm run build
npx wrangler deploy
```

## ۵. اجرای همگام‌سازی اولیه کاتالوگ از سایت اول
```bash
curl -X POST "https://<YOUR_WORKER_DOMAIN>/api/sync/import-from-source" \
  -H "Authorization: Bearer <YOUR_ADMIN_SYNC_TOKEN>"
```
یا با هدر جایگزین:
```bash
curl -X POST "https://<YOUR_WORKER_DOMAIN>/api/sync/import-from-source" \
  -H "X-Admin-Sync-Token: <YOUR_ADMIN_SYNC_TOKEN>"
```

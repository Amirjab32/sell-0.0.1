import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { handleApiRequest } from './api';
import { constantTimeEqual, verifySyncAuth } from './auth';
import { LocalD1Database } from './d1-local';

const MIGRATION_PATH = path.resolve(process.cwd(), 'migrations/0001_init.sql');

function createTestDb(): LocalD1Database {
  const db = new LocalD1Database(':memory:');
  db.applyMigration(MIGRATION_PATH);
  return db;
}

test('constantTimeEqual compares strings accurately', () => {
  assert.equal(constantTimeEqual('secret-token-123', 'secret-token-123'), true);
  assert.equal(constantTimeEqual('secret-token-123', 'secret-token-124'), false);
  assert.equal(constantTimeEqual('short', 'much-longer-token'), false);
});

test('verifySyncAuth returns 503 when unset, 401 when invalid, and passes for valid headers', () => {
  const unset = verifySyncAuth(new Headers(), undefined);
  assert.equal(unset.authorized, false);
  if (!unset.authorized) assert.equal(unset.status, 503);

  const missing = verifySyncAuth(new Headers(), 'my-secret');
  assert.equal(missing.authorized, false);
  if (!missing.authorized) assert.equal(missing.status, 401);

  const wrong = verifySyncAuth(new Headers({ Authorization: 'Bearer nope' }), 'my-secret');
  assert.equal(wrong.authorized, false);
  if (!wrong.authorized) assert.equal(wrong.status, 401);

  const bearerOk = verifySyncAuth(new Headers({ Authorization: 'Bearer my-secret' }), 'my-secret');
  assert.equal(bearerOk.authorized, true);

  const headerOk = verifySyncAuth(new Headers({ 'X-Admin-Sync-Token': 'my-secret' }), 'my-secret');
  assert.equal(headerOk.authorized, true);
});

test('Public APIs never leak server-only columns and hide is_visible=0 items', async () => {
  const db = createTestDb();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO products (
        id, slug, name, brand, category, image_url, gallery_images_json, specs_json,
        description, price_toman, stock_status, warranty, is_featured, is_visible,
        updated_at, created_at, source_url, reference_price_toman, margin_percent, manual_price_lock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      'p1',
      'rtx-4070-super',
      'کارت گرافیک RTX 4070 Super',
      'ASUS',
      'قطعات اصلی کامپیوتر',
      '/images/gpu-card.svg',
      '[]',
      '[{"label":"VRAM","value":"12GB"}]',
      'توضیح محصول',
      52000000,
      'in_stock',
      '۳۶ ماه گارانتی',
      1,
      1,
      now,
      now,
      'https://secret-source.internal/p1',
      48000000,
      8.3,
      0
    )
    .run();

  await db
    .prepare(
      `INSERT INTO products (
        id, slug, name, brand, category, price_toman, stock_status, is_visible, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind('p-hidden', 'hidden-item', 'کالای مخفی', 'MSI', 'مانیتور', 10000000, 'in_stock', 0, now, now)
    .run();

  const catalogRes = await handleApiRequest(new Request('http://localhost/api/catalog'), db, {});
  assert.equal(catalogRes.status, 200);
  const catalogJson = (await catalogRes.json()) as { items: Array<Record<string, unknown>> };
  assert.equal(catalogJson.items.length, 1);

  const item = catalogJson.items[0];
  assert.equal(item.id, 'p1');
  assert.equal('source_url' in item, false);
  assert.equal('reference_price_toman' in item, false);
  assert.equal('margin_percent' in item, false);
  assert.equal('manual_price_lock' in item, false);

  const hiddenDetailRes = await handleApiRequest(
    new Request('http://localhost/api/products/hidden-item'),
    db,
    {}
  );
  assert.equal(hiddenDetailRes.status, 404);

  const visibleDetailRes = await handleApiRequest(
    new Request('http://localhost/api/products/rtx-4070-super'),
    db,
    {}
  );
  assert.equal(visibleDetailRes.status, 200);
  const detailJson = (await visibleDetailRes.json()) as { item: Record<string, unknown> };
  assert.equal('source_url' in detailJson.item, false);
  assert.equal('reference_price_toman' in detailJson.item, false);
});

test('Sync endpoint enforces Golden Rule, manual_price_lock, secret stripping, and replace mode', async () => {
  const db = createTestDb();
  const env = { ADMIN_SYNC_TOKEN: 'super-secret-sync-token' };

  // Unauthorized check must return 401 before doing anything
  const unauthRes = await handleApiRequest(
    new Request('http://localhost/api/sync/import-from-source', { method: 'POST' }),
    db,
    env
  );
  assert.equal(unauthRes.status, 401);

  // Initial sync with confidential Site 1 fields that must NOT be stored
  const initialSyncReq = new Request('http://localhost/api/sync/import-from-source', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Sync-Token': 'super-secret-sync-token',
    },
    body: JSON.stringify({
      items: [
        {
          id: 'item-1',
          name: 'مانیتور ASUS ROG Swift',
          category: 'مانیتور',
          brand: 'ASUS',
          slug: 'asus-rog-swift',
          sourceUrl: 'https://site1.internal/1',
          currentPriceToman: 40000000,
          marginPercent: 5,
          customerQuoteToman: 42000000,
          stockStatus: 'in_stock',
          warranty: '۲۴ ماه',
          shopCostToman: 35000000,
          notes: 'حاشیه سود سری',
          barcodes: ['123456'],
          lastPriceToman: 39000000,
          histories: [{ price: 39000000 }],
        },
        {
          id: 'item-2',
          name: 'کیبورد مکانیکال',
          category: 'تجهیزات گیمینگ',
          currentPriceToman: 5000000,
        },
      ],
    }),
  });

  const firstRes = await handleApiRequest(initialSyncReq, db, env);
  assert.equal(firstRes.status, 200);
  const firstReport = (await firstRes.json()) as { upsertedCount: number };
  assert.equal(firstReport.upsertedCount, 2);

  // Simulate storefront enrichment + manual_price_lock = 1 on item-1
  await db
    .prepare(
      `UPDATE products SET
        slug = 'custom-enriched-slug',
        brand = 'ASUS ROG',
        description = 'توضیحات تکمیلی ویترین',
        specs_json = '[{"label":"پنل","value":"OLED"}]',
        is_featured = 1,
        manual_price_lock = 1,
        price_toman = 43500000
      WHERE id = 'item-1'`
    )
    .run();

  // Second sync in replace mode: item-1 price updates in Site 1, item-2 is omitted -> deleted
  const secondSyncReq = new Request('http://localhost/api/sync/import-from-source', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer super-secret-sync-token',
    },
    body: JSON.stringify({
      mode: 'replace',
      items: [
        {
          id: 'item-1',
          name: 'مانیتور ASUS ROG Swift جدید',
          category: 'مانیتور',
          brand: 'OVERRIDE_SHOULD_IGNORE',
          slug: 'override-slug-should-ignore',
          description: 'override desc should ignore',
          sourceUrl: 'https://site1.internal/1-updated',
          currentPriceToman: 45000000,
          marginPercent: 7.5,
          customerQuoteToman: 48000000,
          stockStatus: 'call',
        },
      ],
    }),
  });

  const secondRes = await handleApiRequest(secondSyncReq, db, env);
  assert.equal(secondRes.status, 200);
  const secondReport = (await secondRes.json()) as { upsertedCount: number; deletedCount: number };
  assert.equal(secondReport.upsertedCount, 1);
  assert.equal(secondReport.deletedCount, 1);

  // Verify Golden Rule & manual_price_lock in DB directly
  const row = await db
    .prepare('SELECT * FROM products WHERE id = ?')
    .bind('item-1')
    .first<Record<string, unknown>>();
  assert.ok(row);
  assert.equal(row.name, 'مانیتور ASUS ROG Swift جدید');
  assert.equal(row.slug, 'custom-enriched-slug');
  assert.equal(row.brand, 'ASUS ROG');
  assert.equal(row.description, 'توضیحات تکمیلی ویترین');
  assert.equal(row.is_featured, 1);
  assert.equal(row.manual_price_lock, 1);
  // Locked price_toman stayed 43500000 while reference_price_toman updated to 45000000
  assert.equal(row.price_toman, 43500000);
  assert.equal(row.reference_price_toman, 45000000);
  assert.equal(row.margin_percent, 7.5);
  assert.equal(row.stock_status, 'call');

  const deletedRow = await db.prepare('SELECT * FROM products WHERE id = ?').bind('item-2').first();
  assert.equal(deletedRow, null);

  // Check health reflects updated counts & lastSyncedAt
  const healthRes = await handleApiRequest(new Request('http://localhost/api/health'), db, env);
  const health = (await healthRes.json()) as { ok: boolean; lastSyncedAt: string | null };
  assert.equal(health.ok, true);
  assert.ok(health.lastSyncedAt);
});

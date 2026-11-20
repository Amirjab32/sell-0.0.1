import type { StockStatus } from '../src/types/catalog';
import type { D1DatabaseLike, D1PreparedStatementLike } from './db-types';

/**
 * Raw incoming payload item from Site 1 (internal pricing system).
 * Confidential Site 1 fields (shopCostToman, notes, barcodes, lastPriceToman, histories)
 * may exist on incoming objects and MUST be stripped / ignored.
 */
export interface SourceCatalogItem {
  id: string | number;
  name: string;
  category?: string;
  brand?: string;
  slug?: string;
  imageUrl?: string;
  image_url?: string;
  galleryImages?: string[];
  specs?: Array<{ label: string; value: string }> | Record<string, string>;
  description?: string;
  warranty?: string;
  stockStatus?: string;
  stock_status?: string;
  inStock?: boolean;
  isFeatured?: boolean;
  is_featured?: boolean | number;
  isVisible?: boolean;
  is_visible?: boolean | number;
  sourceUrl?: string;
  currentPriceToman?: number;
  marginPercent?: number;
  customerQuoteToman?: number | null;
  // Confidential Site 1 fields explicitly NOT persisted:
  // shopCostToman, notes, barcodes, lastPriceToman, histories
}

export interface SyncPayload {
  items?: SourceCatalogItem[];
  products?: SourceCatalogItem[];
  deletedIds?: Array<string | number>;
  mode?: 'merge' | 'replace';
}

export interface NormalizedSyncRecord {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
  gallery_images_json: string;
  specs_json: string;
  description: string;
  price_toman: number;
  stock_status: StockStatus;
  warranty: string;
  is_featured: number;
  is_visible: number;
  source_url: string;
  reference_price_toman: number;
  margin_percent: number;
}

export interface SyncReport {
  ok: true;
  mode: 'merge' | 'replace';
  sourceCount: number;
  upsertedCount: number;
  deletedCount: number;
  syncedAt: string;
  batchesExecuted: number;
}

const BATCH_CHUNK_SIZE = 25;

export function slugifyProduct(name: string, id: string): string {
  const asciiPart = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  const safeIdSuffix = id
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 16);

  if (!asciiPart) {
    return safeIdSuffix ? `item-${safeIdSuffix}` : `item-${Date.now()}`;
  }
  return safeIdSuffix ? `${asciiPart}-${safeIdSuffix}` : asciiPart;
}

function normalizeIncomingStock(item: SourceCatalogItem): StockStatus {
  const raw = (item.stockStatus ?? item.stock_status ?? '').trim().toLowerCase();
  if (raw === 'in_stock' || raw === 'available') return 'in_stock';
  if (raw === 'out_of_stock' || raw === 'unavailable') return 'out_of_stock';
  if (raw === 'call' || raw === 'inquiry') return 'call';
  if (typeof item.inStock === 'boolean') {
    return item.inStock ? 'in_stock' : 'out_of_stock';
  }
  return 'in_stock';
}

function toIntPrice(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.max(0, Math.round(val));
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val.replace(/,/g, ''));
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  return 0;
}

function toFiniteFloat(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Pure mapper from Site 1 item to Site 2 D1 columns.
 * Confidential Site 1 fields (shopCostToman, notes, barcodes, lastPriceToman, histories)
 * are deliberately omitted.
 */
export function mapSourceItemToRecord(item: SourceCatalogItem): NormalizedSyncRecord | null {
  if (item === null || typeof item !== 'object') return null;
  const id = item.id !== undefined && item.id !== null ? String(item.id).trim() : '';
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!id || !name) return null;

  const referencePriceToman = toIntPrice(item.currentPriceToman);
  const customerQuoteToman =
    item.customerQuoteToman !== undefined && item.customerQuoteToman !== null
      ? toIntPrice(item.customerQuoteToman)
      : referencePriceToman;

  const slug =
    typeof item.slug === 'string' && item.slug.trim()
      ? item.slug.trim()
      : slugifyProduct(name, id);

  const galleryImages = Array.isArray(item.galleryImages)
    ? item.galleryImages.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];

  let specsJson = '[]';
  if (Array.isArray(item.specs)) {
    specsJson = JSON.stringify(item.specs);
  } else if (item.specs && typeof item.specs === 'object') {
    specsJson = JSON.stringify(
      Object.entries(item.specs).map(([label, value]) => ({
        label,
        value: String(value ?? ''),
      }))
    );
  }

  return {
    id,
    slug,
    name,
    brand: typeof item.brand === 'string' ? item.brand.trim() : '',
    category:
      typeof item.category === 'string' && item.category.trim()
        ? item.category.trim()
        : 'سایر قطعات',
    image_url:
      typeof item.imageUrl === 'string'
        ? item.imageUrl.trim()
        : typeof item.image_url === 'string'
          ? item.image_url.trim()
          : '',
    gallery_images_json: JSON.stringify(galleryImages),
    specs_json: specsJson,
    description: typeof item.description === 'string' ? item.description.trim() : '',
    price_toman: customerQuoteToman,
    stock_status: normalizeIncomingStock(item),
    warranty: typeof item.warranty === 'string' ? item.warranty.trim() : '',
    is_featured: item.isFeatured || item.is_featured === 1 || item.is_featured === true ? 1 : 0,
    is_visible: item.isVisible === false || item.is_visible === 0 ? 0 : 1,
    source_url: typeof item.sourceUrl === 'string' ? item.sourceUrl.trim() : '',
    reference_price_toman: referencePriceToman,
    margin_percent: toFiniteFloat(item.marginPercent),
  };
}

export function extractItemsFromPayload(payload: unknown): {
  items: SourceCatalogItem[];
  deletedIds: string[];
  mode: 'merge' | 'replace';
} {
  if (Array.isArray(payload)) {
    return {
      items: payload as SourceCatalogItem[],
      deletedIds: [],
      mode: 'merge',
    };
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid sync payload format');
  }
  const obj = payload as SyncPayload;
  const rawItems = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.products)
      ? obj.products
      : [];

  const deletedIds = Array.isArray(obj.deletedIds)
    ? obj.deletedIds.map((id) => String(id).trim()).filter((id) => id.length > 0)
    : [];

  const mode: 'merge' | 'replace' = obj.mode === 'replace' ? 'replace' : 'merge';

  return { items: rawItems, deletedIds, mode };
}

export async function fetchCatalogFromSourceUrl(
  sourceUrl: string,
  sourceToken?: string
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const trimmedToken = sourceToken?.trim();
  if (trimmedToken) {
    headers['X-Sync-Secret'] = trimmedToken;
    headers['Authorization'] = `Bearer ${trimmedToken}`;
  }

  const response = await fetch(sourceUrl, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Source catalog fetch failed with HTTP ${response.status}`);
  }
  return response.json();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function runCatalogSync(
  db: D1DatabaseLike,
  rawPayload: unknown,
  overrideMode?: 'merge' | 'replace'
): Promise<SyncReport> {
  const syncedAt = new Date().toISOString();
  const parsed = extractItemsFromPayload(rawPayload);
  const mode = overrideMode ?? parsed.mode;

  const mappedRecords: NormalizedSyncRecord[] = [];
  for (const item of parsed.items) {
    const mapped = mapSourceItemToRecord(item);
    if (mapped) {
      mappedRecords.push(mapped);
    }
  }

  // Fetch existing ids & slugs to prevent slug collisions for newly inserted items
  // and compute deletions in replace mode.
  const existingRows = await db
    .prepare('SELECT id, slug FROM products')
    .all<{ id: string; slug: string }>();

  const existingIds = new Set(existingRows.results.map((r) => r.id));
  const usedSlugsByOtherIds = new Set(existingRows.results.map((r) => r.slug));

  const statements: D1PreparedStatementLike[] = [];

  for (const record of mappedRecords) {
    let insertSlug = record.slug;
    if (!existingIds.has(record.id)) {
      if (usedSlugsByOtherIds.has(insertSlug)) {
        insertSlug = `${insertSlug}-${record.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || Date.now()}`;
      }
      usedSlugsByOtherIds.add(insertSlug);
    }

    // Golden Sync Rule:
    // On conflict (existing product id):
    // - Preserve slug, brand, gallery_images_json, specs_json, description, is_featured, is_visible, manual_price_lock, created_at
    // - Only update price_toman if manual_price_lock = 0
    const stmt = db
      .prepare(
        `INSERT INTO products (
          id, slug, name, brand, category, image_url, gallery_images_json, specs_json,
          description, price_toman, stock_status, warranty, is_featured, is_visible,
          updated_at, created_at, source_url, reference_price_toman, margin_percent, manual_price_lock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          image_url = excluded.image_url,
          stock_status = excluded.stock_status,
          warranty = excluded.warranty,
          source_url = excluded.source_url,
          reference_price_toman = excluded.reference_price_toman,
          margin_percent = excluded.margin_percent,
          price_toman = CASE
            WHEN products.manual_price_lock = 1 THEN products.price_toman
            ELSE excluded.price_toman
          END,
          updated_at = excluded.updated_at`
      )
      .bind(
        record.id,
        insertSlug,
        record.name,
        record.brand,
        record.category,
        record.image_url,
        record.gallery_images_json,
        record.specs_json,
        record.description,
        record.price_toman,
        record.stock_status,
        record.warranty,
        record.is_featured,
        record.is_visible,
        syncedAt,
        syncedAt,
        record.source_url,
        record.reference_price_toman,
        record.margin_percent
      );
    statements.push(stmt);
  }

  const incomingIdSet = new Set(mappedRecords.map((r) => r.id));
  const idsToDelete = new Set<string>(parsed.deletedIds);

  if (mode === 'replace') {
    for (const existingId of existingIds) {
      if (!incomingIdSet.has(existingId)) {
        idsToDelete.add(existingId);
      }
    }
  }

  let deletedCount = 0;
  for (const deleteId of idsToDelete) {
    if (existingIds.has(deleteId)) {
      deletedCount += 1;
    }
    statements.push(db.prepare('DELETE FROM products WHERE id = ?').bind(deleteId));
  }

  const batches = chunkArray(statements, BATCH_CHUNK_SIZE);
  for (const batch of batches) {
    await db.batch(batch);
  }

  const logId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await db
    .prepare(
      'INSERT INTO sync_logs (id, synced_at, source_count, upserted_count, deleted_count, status, message) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      logId,
      syncedAt,
      parsed.items.length,
      mappedRecords.length,
      deletedCount,
      'success',
      `mode=${mode}; batches=${batches.length}`
    )
    .run();

  return {
    ok: true,
    mode,
    sourceCount: parsed.items.length,
    upsertedCount: mappedRecords.length,
    deletedCount,
    syncedAt,
    batchesExecuted: batches.length,
  };
}

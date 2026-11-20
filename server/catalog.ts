import type {
  CatalogFacet,
  CatalogResponse,
  CatalogSort,
  HealthResponse,
  ProductDetailResponse,
  ProductSpec,
  PublicProduct,
  StockStatus,
} from '../src/types/catalog';
import type { D1DatabaseLike } from './db-types';

/**
 * Explicit allow-list of public storefront columns.
 * Server-only columns (source_url, reference_price_toman, margin_percent, manual_price_lock)
 * MUST NEVER be included here.
 */
export const PUBLIC_PRODUCT_COLUMNS =
  'id, slug, name, brand, category, image_url, gallery_images_json, specs_json, description, price_toman, stock_status, warranty, is_featured, is_visible, updated_at, created_at';

interface RawPublicProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  image_url: string | null;
  gallery_images_json: string | null;
  specs_json: string | null;
  description: string | null;
  price_toman: number;
  stock_status: string;
  warranty: string | null;
  is_featured: number;
  is_visible: number;
  updated_at: string;
  created_at: string;
}

function parseJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function normalizeSpecs(raw: string | null | undefined): ProductSpec[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          label: String((item as { label?: unknown; key?: unknown }).label ?? (item as { key?: unknown }).key ?? '').trim(),
          value: String((item as { value?: unknown }).value ?? '').trim(),
        }))
        .filter((item) => item.label.length > 0 && item.value.length > 0);
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([label, value]) => ({
          label: label.trim(),
          value: String(value ?? '').trim(),
        }))
        .filter((item) => item.label.length > 0 && item.value.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

function normalizeStockStatus(raw: string | null | undefined): StockStatus {
  if (raw === 'in_stock' || raw === 'out_of_stock' || raw === 'call') {
    return raw;
  }
  return 'in_stock';
}

export function mapRowToPublicProduct(row: RawPublicProductRow): PublicProduct {
  const galleryRaw = parseJsonArray<unknown>(row.gallery_images_json)
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim());

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? '',
    category: row.category,
    image_url: row.image_url ?? '',
    gallery_images: galleryRaw,
    specs: normalizeSpecs(row.specs_json),
    description: row.description ?? '',
    price_toman: Number.isFinite(Number(row.price_toman)) ? Number(row.price_toman) : 0,
    stock_status: normalizeStockStatus(row.stock_status),
    warranty: row.warranty ?? '',
    is_featured: Boolean(row.is_featured),
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

export interface CatalogQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  brand?: string;
  stockStatus?: StockStatus | '';
  onlyAvailable?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  featured?: boolean;
  sort?: CatalogSort;
}

export function parseCatalogQueryParams(searchParams: URLSearchParams): CatalogQueryParams {
  const pageRaw = Number(searchParams.get('page') ?? '1');
  const limitRaw = Number(searchParams.get('limit') ?? '24');
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(60, Math.floor(limitRaw)) : 24;

  const q = (searchParams.get('q') ?? searchParams.get('search') ?? '').trim();
  const category = (searchParams.get('category') ?? '').trim();
  const brand = (searchParams.get('brand') ?? '').trim();

  const stockRaw = (searchParams.get('stock_status') ?? searchParams.get('stock') ?? '').trim();
  const stockStatus: StockStatus | '' =
    stockRaw === 'in_stock' || stockRaw === 'out_of_stock' || stockRaw === 'call' ? stockRaw : '';

  const onlyAvailableParam = searchParams.get('onlyAvailable') ?? searchParams.get('in_stock_only') ?? '';
  const onlyAvailable = onlyAvailableParam === 'true' || onlyAvailableParam === '1';

  const minPriceRaw = searchParams.get('minPrice');
  const maxPriceRaw = searchParams.get('maxPrice');
  const minPrice =
    minPriceRaw !== null && minPriceRaw.trim() !== '' && Number.isFinite(Number(minPriceRaw))
      ? Math.max(0, Math.floor(Number(minPriceRaw)))
      : null;
  const maxPrice =
    maxPriceRaw !== null && maxPriceRaw.trim() !== '' && Number.isFinite(Number(maxPriceRaw))
      ? Math.max(0, Math.floor(Number(maxPriceRaw)))
      : null;

  const featuredParam = searchParams.get('featured') ?? '';
  const featured = featuredParam === '1' || featuredParam === 'true';

  const sortRaw = (searchParams.get('sort') ?? 'in_stock_first').trim();
  const sort: CatalogSort =
    sortRaw === 'cheapest' || sortRaw === 'expensive' || sortRaw === 'newest' || sortRaw === 'in_stock_first'
      ? sortRaw
      : 'in_stock_first';

  return {
    page,
    limit,
    q,
    category,
    brand,
    stockStatus,
    onlyAvailable,
    minPrice,
    maxPrice,
    featured,
    sort,
  };
}

export function buildCatalogWhereClause(params: CatalogQueryParams): {
  whereSql: string;
  bindings: unknown[];
} {
  const conditions: string[] = ['is_visible = 1'];
  const bindings: unknown[] = [];

  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push('(name LIKE ? OR brand LIKE ? OR category LIKE ? OR description LIKE ?)');
    bindings.push(pattern, pattern, pattern, pattern);
  }

  if (params.category) {
    conditions.push('category = ?');
    bindings.push(params.category);
  }

  if (params.brand) {
    conditions.push('brand = ?');
    bindings.push(params.brand);
  }

  if (params.onlyAvailable) {
    conditions.push("stock_status = 'in_stock'");
  } else if (params.stockStatus) {
    conditions.push('stock_status = ?');
    bindings.push(params.stockStatus);
  }

  if (params.minPrice !== null && params.minPrice !== undefined) {
    conditions.push('price_toman >= ?');
    bindings.push(params.minPrice);
  }

  if (params.maxPrice !== null && params.maxPrice !== undefined) {
    conditions.push('price_toman <= ?');
    bindings.push(params.maxPrice);
  }

  if (params.featured) {
    conditions.push('is_featured = 1');
  }

  return {
    whereSql: conditions.join(' AND '),
    bindings,
  };
}

export function getOrderByClause(sort: CatalogSort = 'in_stock_first'): string {
  switch (sort) {
    case 'cheapest':
      return "CASE WHEN price_toman > 0 THEN 0 ELSE 1 END ASC, price_toman ASC, is_featured DESC, updated_at DESC";
    case 'expensive':
      return 'price_toman DESC, is_featured DESC, updated_at DESC';
    case 'newest':
      return 'created_at DESC, updated_at DESC';
    case 'in_stock_first':
    default:
      return "CASE stock_status WHEN 'in_stock' THEN 0 WHEN 'call' THEN 1 ELSE 2 END ASC, is_featured DESC, updated_at DESC";
  }
}

export async function getLastSyncedAt(db: D1DatabaseLike): Promise<string | null> {
  const row = await db
    .prepare("SELECT synced_at FROM sync_logs WHERE status = 'success' ORDER BY synced_at DESC LIMIT 1")
    .first<{ synced_at: string }>();
  return row?.synced_at ?? null;
}

export async function getHealthStatus(
  db: D1DatabaseLike,
  environment = 'development'
): Promise<HealthResponse> {
  const countsRow = await db
    .prepare(
      "SELECT COUNT(*) AS totalVisibleCount, SUM(CASE WHEN stock_status = 'in_stock' THEN 1 ELSE 0 END) AS availableCount FROM products WHERE is_visible = 1"
    )
    .first<{ totalVisibleCount: number; availableCount: number | null }>();

  const lastSyncedAt = await getLastSyncedAt(db);

  return {
    ok: true,
    availableCount: Number(countsRow?.availableCount ?? 0),
    totalVisibleCount: Number(countsRow?.totalVisibleCount ?? 0),
    lastSyncedAt,
    environment,
  };
}

export async function queryPublicCatalog(
  db: D1DatabaseLike,
  params: CatalogQueryParams,
  environment = 'development'
): Promise<CatalogResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;
  const offset = (page - 1) * limit;

  const { whereSql, bindings } = buildCatalogWhereClause(params);
  const orderBy = getOrderByClause(params.sort);

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM products WHERE ${whereSql}`)
    .bind(...bindings)
    .first<{ total: number }>();
  const total = Number(countRow?.total ?? 0);

  const rowsResult = await db
    .prepare(`SELECT ${PUBLIC_PRODUCT_COLUMNS} FROM products WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .bind(...bindings, limit, offset)
    .all<RawPublicProductRow>();

  const categoriesResult = await db
    .prepare(
      "SELECT category AS name, COUNT(*) AS count FROM products WHERE is_visible = 1 AND category != '' GROUP BY category ORDER BY count DESC, category ASC"
    )
    .all<{ name: string; count: number }>();

  const brandsResult = await db
    .prepare(
      "SELECT brand AS name, COUNT(*) AS count FROM products WHERE is_visible = 1 AND brand != '' GROUP BY brand ORDER BY count DESC, brand ASC"
    )
    .all<{ name: string; count: number }>();

  const priceBoundsRow = await db
    .prepare(
      'SELECT COUNT(*) AS totalCatalogCount, MIN(CASE WHEN price_toman > 0 THEN price_toman ELSE NULL END) AS minPrice, MAX(price_toman) AS maxPrice FROM products WHERE is_visible = 1'
    )
    .first<{ totalCatalogCount: number; minPrice: number | null; maxPrice: number | null }>();

  const lastSyncedAt = await getLastSyncedAt(db);

  return {
    items: rowsResult.results.map(mapRowToPublicProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    facets: {
      categories: categoriesResult.results.map((r): CatalogFacet => ({
        name: r.name,
        count: Number(r.count),
      })),
      brands: brandsResult.results.map((r): CatalogFacet => ({
        name: r.name,
        count: Number(r.count),
      })),
      minPrice: Number(priceBoundsRow?.minPrice ?? 0),
      maxPrice: Number(priceBoundsRow?.maxPrice ?? 0),
    },
    totalCatalogCount: Number(priceBoundsRow?.totalCatalogCount ?? 0),
    lastSyncedAt,
    environment,
  };
}

export async function queryPublicProductByIdOrSlug(
  db: D1DatabaseLike,
  idOrSlug: string
): Promise<ProductDetailResponse | null> {
  const key = idOrSlug.trim();
  if (!key) return null;

  const row = await db
    .prepare(
      `SELECT ${PUBLIC_PRODUCT_COLUMNS} FROM products WHERE is_visible = 1 AND (slug = ? OR id = ?) LIMIT 1`
    )
    .bind(key, key)
    .first<RawPublicProductRow>();

  if (!row) return null;

  const item = mapRowToPublicProduct(row);

  const relatedResult = await db
    .prepare(
      `SELECT ${PUBLIC_PRODUCT_COLUMNS} FROM products WHERE is_visible = 1 AND category = ? AND id != ? ORDER BY CASE stock_status WHEN 'in_stock' THEN 0 WHEN 'call' THEN 1 ELSE 2 END ASC, is_featured DESC LIMIT 4`
    )
    .bind(item.category, item.id)
    .all<RawPublicProductRow>();

  const lastSyncedAt = await getLastSyncedAt(db);

  return {
    item,
    related: relatedResult.results.map(mapRowToPublicProduct),
    lastSyncedAt,
  };
}

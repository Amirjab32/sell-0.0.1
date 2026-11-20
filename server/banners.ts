import type { AdminBanner, BannerTargetType, PublicBanner } from '../src/types/catalog';
import type { D1DatabaseLike } from './db-types';

const VALID_TARGET_TYPES = new Set<BannerTargetType>([
  'none',
  'category',
  'brand',
  'search',
  'product',
  'url',
]);

// Keep uploaded banner payloads well under Cloudflare D1 row size limits (~1.4 MB string)
const MAX_IMAGE_URL_LENGTH = 1_400_000;

interface RawBannerRow {
  id: string;
  title: string | null;
  image_url: string;
  target_type: string;
  target_value: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export async function ensureHeroBannersTable(db: D1DatabaseLike): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS hero_banners (
        id TEXT PRIMARY KEY,
        title TEXT DEFAULT '',
        image_url TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT 'none' CHECK (target_type IN ('none', 'category', 'brand', 'search', 'product', 'url')),
        target_value TEXT DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      'CREATE INDEX IF NOT EXISTS idx_hero_banners_active_order ON hero_banners(is_active, sort_order ASC, created_at DESC)'
    )
    .run();
}

function normalizeTargetType(raw: unknown): BannerTargetType {
  const str = typeof raw === 'string' ? raw.trim() : 'none';
  return VALID_TARGET_TYPES.has(str as BannerTargetType) ? (str as BannerTargetType) : 'none';
}

export function validateBannerImageUrl(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'تصویر بنر الزامی است.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
    return {
      ok: false,
      error: 'حجم تصویر آپلودشده بیش از حد مجاز است (حداکثر حدود ۱ مگابایت پس از بهینه‌سازی).',
    };
  }
  const isHttp = trimmed.startsWith('https://') || trimmed.startsWith('http://');
  const isLocalPath = trimmed.startsWith('/') && !trimmed.startsWith('//');
  const isAllowedDataUri =
    /^data:image\/(?:png|jpeg|jpg|webp|avif|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);

  if (!isHttp && !isLocalPath && !isAllowedDataUri) {
    return {
      ok: false,
      error: 'فرمت تصویر نامعتبر است. تصویر باید فایل معتبر تصویری یا آدرس اینترنتی باشد.',
    };
  }
  return { ok: true, value: trimmed };
}

function resolvePublicImageUrl(row: RawBannerRow): string {
  if (row.image_url.startsWith('data:image/')) {
    return `/api/banners/image/${encodeURIComponent(row.id)}?v=${encodeURIComponent(row.updated_at)}`;
  }
  return row.image_url;
}

function mapRowToPublicBanner(row: RawBannerRow): PublicBanner {
  return {
    id: row.id,
    title: row.title ?? '',
    image_url: resolvePublicImageUrl(row),
    target_type: normalizeTargetType(row.target_type),
    target_value: row.target_value ?? '',
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapRowToAdminBanner(row: RawBannerRow): AdminBanner {
  return {
    ...mapRowToPublicBanner(row),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listPublicBanners(db: D1DatabaseLike): Promise<PublicBanner[]> {
  await ensureHeroBannersTable(db);
  const res = await db
    .prepare(
      'SELECT id, title, image_url, target_type, target_value, sort_order, is_active, created_at, updated_at FROM hero_banners WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC'
    )
    .all<RawBannerRow>();
  return res.results.map(mapRowToPublicBanner);
}

export async function listAdminBanners(db: D1DatabaseLike): Promise<AdminBanner[]> {
  await ensureHeroBannersTable(db);
  const res = await db
    .prepare(
      'SELECT id, title, image_url, target_type, target_value, sort_order, is_active, created_at, updated_at FROM hero_banners ORDER BY sort_order ASC, created_at DESC'
    )
    .all<RawBannerRow>();
  return res.results.map(mapRowToAdminBanner);
}

export async function getBannerImagePayload(
  db: D1DatabaseLike,
  id: string
): Promise<{ bytes: Uint8Array; contentType: string } | { redirectUrl: string } | null> {
  await ensureHeroBannersTable(db);
  const row = await db
    .prepare('SELECT image_url FROM hero_banners WHERE id = ? LIMIT 1')
    .bind(id)
    .first<{ image_url: string }>();

  if (!row || !row.image_url) return null;

  if (!row.image_url.startsWith('data:image/')) {
    return { redirectUrl: row.image_url };
  }

  const match = row.image_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;

  const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, contentType };
}

export interface BannerMutationInput {
  title?: unknown;
  image_url?: unknown;
  target_type?: unknown;
  target_value?: unknown;
  sort_order?: unknown;
  is_active?: unknown;
}

export async function createAdminBanner(
  db: D1DatabaseLike,
  input: BannerMutationInput
): Promise<{ ok: true; item: AdminBanner } | { ok: false; error: string; status: number }> {
  await ensureHeroBannersTable(db);

  const imgCheck = validateBannerImageUrl(input.image_url);
  if (!imgCheck.ok) {
    return { ok: false, error: imgCheck.error, status: 400 };
  }

  const targetType = normalizeTargetType(input.target_type);
  const targetValue =
    targetType === 'none'
      ? ''
      : typeof input.target_value === 'string'
        ? input.target_value.trim()
        : '';

  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 160) : '';
  const isActive = input.is_active === false || input.is_active === 0 ? 0 : 1;

  let sortOrder: number;
  if (typeof input.sort_order === 'number' && Number.isFinite(input.sort_order)) {
    sortOrder = Math.floor(input.sort_order);
  } else {
    const maxRow = await db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM hero_banners')
      .first<{ maxOrder: number }>();
    sortOrder = Number(maxRow?.maxOrder ?? -1) + 1;
  }

  const now = new Date().toISOString();
  const id = `banner-${crypto.randomUUID()}`;

  await db
    .prepare(
      `INSERT INTO hero_banners (
        id, title, image_url, target_type, target_value, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, title, imgCheck.value, targetType, targetValue, sortOrder, isActive, now, now)
    .run();

  const created = await db
    .prepare(
      'SELECT id, title, image_url, target_type, target_value, sort_order, is_active, created_at, updated_at FROM hero_banners WHERE id = ? LIMIT 1'
    )
    .bind(id)
    .first<RawBannerRow>();

  if (!created) {
    return { ok: false, error: 'خطا در ذخیره‌سازی بنر.', status: 500 };
  }

  return { ok: true, item: mapRowToAdminBanner(created) };
}

export async function updateAdminBanner(
  db: D1DatabaseLike,
  id: string,
  input: BannerMutationInput
): Promise<{ ok: true; item: AdminBanner } | { ok: false; error: string; status: number }> {
  await ensureHeroBannersTable(db);

  const existing = await db
    .prepare(
      'SELECT id, title, image_url, target_type, target_value, sort_order, is_active, created_at, updated_at FROM hero_banners WHERE id = ? LIMIT 1'
    )
    .bind(id)
    .first<RawBannerRow>();

  if (!existing) {
    return { ok: false, error: 'بنر مورد نظر یافت نشد.', status: 404 };
  }

  let nextImageUrl = existing.image_url;
  if (input.image_url !== undefined) {
    const incomingUrl = typeof input.image_url === 'string' ? input.image_url.trim() : '';
    const selfImagePrefix = `/api/banners/image/${encodeURIComponent(id)}`;
    if (incomingUrl === selfImagePrefix || incomingUrl.startsWith(`${selfImagePrefix}?`)) {
      nextImageUrl = existing.image_url;
    } else {
      const imgCheck = validateBannerImageUrl(input.image_url);
      if (!imgCheck.ok) {
        return { ok: false, error: imgCheck.error, status: 400 };
      }
      nextImageUrl = imgCheck.value;
    }
  }

  const nextTitle =
    input.title !== undefined
      ? typeof input.title === 'string'
        ? input.title.trim().slice(0, 160)
        : ''
      : (existing.title ?? '');

  const nextTargetType =
    input.target_type !== undefined
      ? normalizeTargetType(input.target_type)
      : normalizeTargetType(existing.target_type);

  const rawTargetVal =
    input.target_value !== undefined
      ? typeof input.target_value === 'string'
        ? input.target_value.trim()
        : ''
      : (existing.target_value ?? '');
  const nextTargetValue = nextTargetType === 'none' ? '' : rawTargetVal;

  const nextSortOrder =
    typeof input.sort_order === 'number' && Number.isFinite(input.sort_order)
      ? Math.floor(input.sort_order)
      : existing.sort_order;

  const nextIsActive =
    input.is_active !== undefined
      ? input.is_active === false || input.is_active === 0
        ? 0
        : 1
      : existing.is_active;

  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE hero_banners SET
        title = ?,
        image_url = ?,
        target_type = ?,
        target_value = ?,
        sort_order = ?,
        is_active = ?,
        updated_at = ?
      WHERE id = ?`
    )
    .bind(
      nextTitle,
      nextImageUrl,
      nextTargetType,
      nextTargetValue,
      nextSortOrder,
      nextIsActive,
      now,
      id
    )
    .run();

  const updated = await db
    .prepare(
      'SELECT id, title, image_url, target_type, target_value, sort_order, is_active, created_at, updated_at FROM hero_banners WHERE id = ? LIMIT 1'
    )
    .bind(id)
    .first<RawBannerRow>();

  if (!updated) {
    return { ok: false, error: 'خطا در بروزرسانی بنر.', status: 500 };
  }

  return { ok: true, item: mapRowToAdminBanner(updated) };
}

export async function deleteAdminBanner(db: D1DatabaseLike, id: string): Promise<boolean> {
  await ensureHeroBannersTable(db);
  const res = await db.prepare('DELETE FROM hero_banners WHERE id = ?').bind(id).run();
  return Number(res.meta.changes ?? 0) > 0;
}

export async function reorderAdminBanners(db: D1DatabaseLike, orderedIds: string[]): Promise<AdminBanner[]> {
  await ensureHeroBannersTable(db);
  const cleanIds = orderedIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  const now = new Date().toISOString();

  if (cleanIds.length > 0) {
    const statements = cleanIds.map((id, idx) =>
      db
        .prepare('UPDATE hero_banners SET sort_order = ?, updated_at = ? WHERE id = ?')
        .bind(idx, now, id)
    );
    await db.batch(statements);
  }

  return listAdminBanners(db);
}

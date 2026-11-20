import { verifySyncAuth } from './auth';
import {
  type BannerMutationInput,
  createAdminBanner,
  deleteAdminBanner,
  getBannerImagePayload,
  listAdminBanners,
  listPublicBanners,
  reorderAdminBanners,
  updateAdminBanner,
} from './banners';
import {
  getHealthStatus,
  parseCatalogQueryParams,
  queryPublicCatalog,
  queryPublicProductByIdOrSlug,
} from './catalog';
import type { D1DatabaseLike, ServerEnvConfig } from './db-types';
import { fetchCatalogFromSourceUrl, runCatalogSync } from './sync';

export const API_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Sync-Token',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...API_CORS_HEADERS,
    },
  });
}

export async function handleApiRequest(
  request: Request,
  db: D1DatabaseLike,
  env: ServerEnvConfig
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: API_CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const environment = env.APP_ENV || 'development';

  try {
    // 1. GET /api/health
    if (request.method === 'GET' && pathname === '/api/health') {
      const health = await getHealthStatus(db, environment);
      return jsonResponse(health, 200);
    }

    // 2. GET /api/catalog or /api/products
    if (request.method === 'GET' && (pathname === '/api/catalog' || pathname === '/api/products')) {
      const params = parseCatalogQueryParams(url.searchParams);
      const catalog = await queryPublicCatalog(db, params, environment);
      return jsonResponse(catalog, 200);
    }

    // 3. GET /api/catalog/:idOrSlug or /api/products/:idOrSlug
    if (request.method === 'GET') {
      const detailMatch = pathname.match(/^\/api\/(?:catalog|products)\/([^/]+)$/);
      if (detailMatch) {
        const idOrSlug = decodeURIComponent(detailMatch[1]);
        const detail = await queryPublicProductByIdOrSlug(db, idOrSlug);
        if (!detail) {
          return jsonResponse({ error: 'Product not found' }, 404);
        }
        return jsonResponse(detail, 200);
      }
    }

    // 4. POST /api/sync/import-from-source (Protected)
    if (request.method === 'POST' && pathname === '/api/sync/import-from-source') {
      const authResult = verifySyncAuth(request.headers, env.ADMIN_SYNC_TOKEN);
      if (authResult.authorized === false) {
        return jsonResponse({ error: authResult.error }, authResult.status);
      }

      let rawBody: unknown = null;
      const contentType = request.headers.get('Content-Type') ?? '';
      if (contentType.includes('application/json')) {
        const text = await request.text();
        if (text.trim()) {
          try {
            rawBody = JSON.parse(text);
          } catch {
            return jsonResponse({ error: 'Invalid JSON request body' }, 400);
          }
        }
      }

      const bodyObj =
        rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
          ? (rawBody as { items?: unknown; products?: unknown; mode?: 'merge' | 'replace' })
          : null;

      const hasDirectItems =
        Array.isArray(rawBody) ||
        (bodyObj !== null && (Array.isArray(bodyObj.items) || Array.isArray(bodyObj.products)));

      let payloadToSync: unknown;
      if (hasDirectItems) {
        payloadToSync = rawBody;
      } else {
        const sourceUrl = env.SOURCE_CATALOG_URL?.trim();
        if (!sourceUrl) {
          return jsonResponse(
            {
              error:
                'SOURCE_CATALOG_URL is not configured and no direct catalog payload was provided.',
            },
            500
          );
        }
        payloadToSync = await fetchCatalogFromSourceUrl(sourceUrl, env.SOURCE_CATALOG_TOKEN);
      }

      const modeParam = url.searchParams.get('mode');
      const overrideMode =
        modeParam === 'replace' || modeParam === 'merge' ? modeParam : bodyObj?.mode;

      const report = await runCatalogSync(db, payloadToSync, overrideMode);
      return jsonResponse(report, 200);
    }

    // 5. GET /api/banners (Public active hero slides)
    if (request.method === 'GET' && pathname === '/api/banners') {
      const items = await listPublicBanners(db);
      return jsonResponse({ items }, 200);
    }

    // 6. GET /api/banners/image/:id (Public uploaded banner image binary)
    if (request.method === 'GET') {
      const imgMatch = pathname.match(/^\/api\/banners\/image\/([^/]+)$/);
      if (imgMatch) {
        const bannerId = decodeURIComponent(imgMatch[1]);
        const payload = await getBannerImagePayload(db, bannerId);
        if (!payload) {
          return jsonResponse({ error: 'Banner image not found' }, 404);
        }
        if ('redirectUrl' in payload) {
          return Response.redirect(new URL(payload.redirectUrl, url.origin).toString(), 302);
        }
        return new Response(new Uint8Array(payload.bytes), {
          status: 200,
          headers: {
            'Content-Type': payload.contentType,
            'Cache-Control': 'public, max-age=3600',
            ...API_CORS_HEADERS,
          },
        });
      }
    }

    // 7. Admin Banner Management Routes (Strictly protected by ADMIN_SYNC_TOKEN)
    if (pathname === '/api/admin/verify' && request.method === 'POST') {
      const authResult = verifySyncAuth(request.headers, env.ADMIN_SYNC_TOKEN);
      if (authResult.authorized === false) {
        return jsonResponse({ error: authResult.error }, authResult.status);
      }
      return jsonResponse({ ok: true }, 200);
    }

    if (pathname === '/api/admin/banners' && request.method === 'GET') {
      const authResult = verifySyncAuth(request.headers, env.ADMIN_SYNC_TOKEN);
      if (authResult.authorized === false) {
        return jsonResponse({ error: authResult.error }, authResult.status);
      }
      const items = await listAdminBanners(db);
      return jsonResponse({ items }, 200);
    }

    if (pathname === '/api/admin/banners' && request.method === 'POST') {
      const authResult = verifySyncAuth(request.headers, env.ADMIN_SYNC_TOKEN);
      if (authResult.authorized === false) {
        return jsonResponse({ error: authResult.error }, authResult.status);
      }
      let body: BannerMutationInput;
      try {
        body = (await request.json()) as BannerMutationInput;
      } catch {
        return jsonResponse({ error: 'Invalid JSON request body' }, 400);
      }
      const result = await createAdminBanner(db, body);
      if (!result.ok) {
        return jsonResponse({ error: result.error }, result.status);
      }
      return jsonResponse({ item: result.item }, 201);
    }

    if (pathname === '/api/admin/banners/reorder' && request.method === 'POST') {
      const authResult = verifySyncAuth(request.headers, env.ADMIN_SYNC_TOKEN);
      if (authResult.authorized === false) {
        return jsonResponse({ error: authResult.error }, authResult.status);
      }
      let body: { ids?: unknown };
      try {
        body = (await request.json()) as { ids?: unknown };
      } catch {
        return jsonResponse({ error: 'Invalid JSON request body' }, 400);
      }
      if (!Array.isArray(body?.ids)) {
        return jsonResponse({ error: 'ids array is required' }, 400);
      }
      const items = await reorderAdminBanners(
        db,
        body.ids.filter((v): v is string => typeof v === 'string')
      );
      return jsonResponse({ items }, 200);
    }

    const adminBannerMatch = pathname.match(/^\/api\/admin\/banners\/([^/]+)$/);
    if (adminBannerMatch) {
      const authResult = verifySyncAuth(request.headers, env.ADMIN_SYNC_TOKEN);
      if (authResult.authorized === false) {
        return jsonResponse({ error: authResult.error }, authResult.status);
      }
      const bannerId = decodeURIComponent(adminBannerMatch[1]);

      if (request.method === 'PUT') {
        let body: BannerMutationInput;
        try {
          body = (await request.json()) as BannerMutationInput;
        } catch {
          return jsonResponse({ error: 'Invalid JSON request body' }, 400);
        }
        const result = await updateAdminBanner(db, bannerId, body);
        if (!result.ok) {
          return jsonResponse({ error: result.error }, result.status);
        }
        return jsonResponse({ item: result.item }, 200);
      }

      if (request.method === 'DELETE') {
        const deleted = await deleteAdminBanner(db, bannerId);
        if (!deleted) {
          return jsonResponse({ error: 'Banner not found' }, 404);
        }
        return jsonResponse({ ok: true }, 200);
      }
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
}

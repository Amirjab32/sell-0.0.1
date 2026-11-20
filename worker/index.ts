import type { D1Database, Fetcher } from '@cloudflare/workers-types';
import { handleApiRequest } from '../server/api';
import type { D1DatabaseLike, ServerEnvConfig } from '../server/db-types';

export interface Env extends ServerEnvConfig {
  DB: D1Database;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Defensive check: ensure all non-API routes (including /product/:slug)
    // are served directly by Cloudflare Assets SPA handling without 404.
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request as unknown as Parameters<Fetcher['fetch']>[0]) as unknown as Promise<Response>;
    }

    return handleApiRequest(request, env.DB as unknown as D1DatabaseLike, {
      ADMIN_SYNC_TOKEN: env.ADMIN_SYNC_TOKEN,
      SOURCE_CATALOG_URL: env.SOURCE_CATALOG_URL,
      SOURCE_CATALOG_TOKEN: env.SOURCE_CATALOG_TOKEN,
      APP_ENV: env.APP_ENV || 'production',
    });
  },
};

import 'dotenv/config';
import express, { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { handleApiRequest } from './server/api';
import { LocalD1Database } from './server/d1-local';
import { seedDevDatabaseIfEmpty } from './server/dev-seed';

const PORT = 3000;
const appEnv = process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
const sqlitePath = process.env.LOCAL_SQLITE_PATH || path.resolve(process.cwd(), '.data/local.db');
const migrationPath = path.resolve(process.cwd(), 'migrations/0001_init.sql');

async function startServer() {
  const db = new LocalD1Database(sqlitePath);
  db.applyMigration(migrationPath);

  // Seed sample hardware data ONLY in local development when the database is empty
  if (appEnv !== 'production') {
    await seedDevDatabaseIfEmpty(db);
  }

  const app = express();

  // Read raw body for /api/* so Web Request handler parses JSON uniformly
  app.use('/api', express.raw({ type: '*/*', limit: '5mb' }), async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || `localhost:${PORT}`;
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        } else if (typeof value === 'string') {
          headers.set(key, value);
        }
      }

      const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length > 0;
      const webRequest = new Request(fullUrl, {
        method: req.method,
        headers,
        body: hasBody ? new Uint8Array(req.body) : undefined,
      });

      const webResponse = await handleApiRequest(webRequest, db, {
        ADMIN_SYNC_TOKEN: process.env.ADMIN_SYNC_TOKEN,
        SOURCE_CATALOG_URL: process.env.SOURCE_CATALOG_URL,
        SOURCE_CATALOG_TOKEN: process.env.SOURCE_CATALOG_TOKEN,
        APP_ENV: appEnv,
      });

      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const arrayBuf = await webResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (${appEnv})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

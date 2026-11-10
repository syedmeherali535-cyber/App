/**
 * Express application factory: security headers, API routers, static client.
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.js';
import { createDb } from './db.js';
import { ensureUploadDirs, uploadDirs } from './uploads.js';
import { seedPortfolio } from './seed.js';
import createPublicRouter from './routes/public.js';
import createAdminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "script-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CSP);
  if (req.path.startsWith('/api/admin')) res.setHeader('Cache-Control', 'no-store');
  next();
}

export function createApp(options = {}) {
  const env = options.env || process.env;
  const db = options.db || createDb(env.DATABASE_PATH || './data/meher-emb.db');
  const dirs = options.dirs || ensureUploadDirs(uploadDirs(env.UPLOAD_DIR || './data/uploads'));
  seedPortfolio(db, dirs);
  const auth = createAuth(env);

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'meher-emb', adminConfigured: auth.isConfigured });
  });

  app.use('/api', createPublicRouter({ db, dirs, env }));
  app.use('/api/admin', createAdminRouter({ db, dirs, auth, env }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

  if (fs.existsSync(DIST_DIR)) {
    app.use(
      express.static(DIST_DIR, {
        index: false,
        maxAge: '1h',
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
  }

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint not found.' });
    const indexFile = path.join(DIST_DIR, 'index.html');
    if (!fs.existsSync(indexFile)) {
      return res
        .status(503)
        .type('text/plain')
        .send('The website build is missing. Run "npm run build" and restart the server.');
    }
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(indexFile);
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'That file is larger than the 10 MB upload limit.' });
    }
    if (err && (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT')) {
      return res.status(400).json({ error: 'Unexpected upload. Check the file field and try again.' });
    }
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
    console.error('[api] unhandled error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
  });

  return { app, db, dirs, auth };
}

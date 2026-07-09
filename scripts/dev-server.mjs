// Minimal local stand-in for Vercel: serves the built dist/ folder and mounts
// the api/ handlers with a small (req,res) adapter. For local verification
// only — production runs on Vercel itself.
//
//   npm run build && node scripts/dev-server.mjs
//
// Env vars (ADMIN_PASSWORD, STATE_SECRET, GMAIL_USER…) apply as in prod.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const port = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const apiRoutes = {
  '/api/share': () => import('../api/share.js'),
  '/api/admin/state': () => import('../api/admin/state.js'),
  '/api/cron/reminders': () => import('../api/cron/reminders.js'),
};

function adapt(req, res, url) {
  req.query = Object.fromEntries(url.searchParams.entries());
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res; };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  const route = apiRoutes[url.pathname];
  if (route) {
    try {
      const mod = await route();
      adapt(req, res, url);
      await mod.default(req, res);
    } catch (e) {
      console.error('api error', e);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'dev_server_error', message: String(e && e.message || e) }));
    }
    return;
  }

  // Static with SPA fallback (mirrors the /s/:id rewrite in vercel.json)
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (/^\/s\//.test(path)) path = '/index.html';
  try {
    const data = await readFile(join(dist, path));
    res.setHeader('Content-Type', MIME[extname(path)] || 'application/octet-stream');
    res.end(data);
  } catch {
    try {
      const data = await readFile(join(dist, 'index.html'));
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end('not found');
    }
  }
});

server.listen(port, () => console.log(`dev server on http://localhost:${port}`));

// Shared admin state (docs library, vendors, saved signatures).
//
// Auth: HTTP Basic against ADMIN_EMAILS + ADMIN_PASSWORD env vars.
//   Falls back to the historical built-in credentials when the env vars are
//   not set, so a deploy without configuration never locks the admins out —
//   but DO set them (and rotate the password) as soon as possible.
//
// Confidentiality: when STATE_SECRET is set, the state blob (and every new
//   backup) is written AES-256-GCM-encrypted, so the public blob URL no
//   longer exposes documents or signatures. Legacy plaintext blobs keep
//   reading fine; the first write after enabling the secret re-encrypts.
//
// Concurrency: PUT merges per-entity by id (newest updatedAt/deletedAt wins)
//   for docs, vendors AND saved signatures, so two admins editing different
//   things concurrently never clobber each other.

import { put, list, del } from '@vercel/blob';
import { mergeById } from '../../lib/merge.js';
import { encodeState, decodeState, getStateSecret } from '../../lib/state-crypto.js';

function adminUsers() {
  const raw = process.env.ADMIN_EMAILS || 'orias3@gmail.com,amitbens97@gmail.com';
  return new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}
function adminPassword() {
  return process.env.ADMIN_PASSWORD || 'FlowBiz517268330';
}

const STATE_PATH = 'admin/_aot_shared_state_d8f3k29l.json';
const BACKUP_PREFIX = 'admin/backups/';
const KEEP_BACKUPS = 40;
const BLOB_BASE = 'https://bjitaw3flhgszddh.public.blob.vercel-storage.com';

// Read the live state blob bypassing the CDN edge cache. Vercel Blob's public
// URL is edge-cached, which otherwise gives a ~5-8s read-after-write window
// where a just-written version isn't visible — bad for the merge, which relies
// on reading the freshest `prev`. A unique query param forces an origin fetch,
// and writing the blob with cacheControlMaxAge:0 keeps the edge from caching it.
async function readState() {
  try {
    const r = await fetch(`${BLOB_BASE}/${STATE_PATH}?_cb=${Date.now()}_${Math.random().toString(36).slice(2)}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return decodeState(await r.json());
  } catch { return null; }
}
async function writeState(payload) {
  return put(STATE_PATH, encodeState(payload), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

// Save a snapshot of the previous state before it gets overwritten, and prune
// old snapshots. Fully best-effort — any failure here must never break the
// main write, so every caller wraps this in try/catch and ignores errors.
async function backupPrevState(prev) {
  if (!prev) return;
  const ver = (prev._meta && prev._meta.version) || 0;
  const ts = (prev._meta && prev._meta.lastUpdated) || Date.now();
  const key = `${BACKUP_PREFIX}v${String(ver).padStart(6, '0')}_${ts}.json`;
  await put(key, encodeState(prev), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  // Prune oldest beyond KEEP_BACKUPS
  try {
    const { blobs } = await list({ prefix: BACKUP_PREFIX });
    if (blobs && blobs.length > KEEP_BACKUPS) {
      const sorted = blobs.slice().sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
      const toDelete = sorted.slice(0, blobs.length - KEEP_BACKUPS).map((b) => b.url);
      if (toDelete.length) await del(toDelete);
    }
  } catch {}
}

function authorizedEmail(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return null;
  let decoded;
  try { decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8'); }
  catch { return null; }
  const idx = decoded.indexOf(':');
  if (idx < 0) return null;
  const email = decoded.slice(0, idx).trim().toLowerCase();
  const pwd = decoded.slice(idx + 1);
  if (!adminUsers().has(email) || pwd !== adminPassword()) return null;
  return email;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = authorizedEmail(req);
  if (!user) {
    res.setHeader('WWW-Authenticate', 'Basic realm="FlowBiz Admin"');
    return res.status(401).json({ error: 'unauthorized' });
  }

  // ── Backups listing: GET /api/admin/state?backups=1 ──
  if (req.method === 'GET' && req.query && req.query.backups) {
    try {
      const { blobs } = await list({ prefix: BACKUP_PREFIX });
      const items = (blobs || [])
        .map((b) => ({ pathname: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt }))
        .sort((a, b) => (a.pathname < b.pathname ? 1 : -1)); // newest first
      return res.status(200).json({ backups: items });
    } catch (e) {
      return res.status(200).json({ backups: [] });
    }
  }

  // ── Restore: POST /api/admin/state?restore=<pathname or url> ──
  if (req.method === 'POST') {
    const which = (req.query && (req.query.restore || req.query.url)) || '';
    if (!which) return res.status(400).json({ error: 'missing_restore_target' });
    try {
      const url = /^https?:\/\//.test(which) ? which : `${BLOB_BASE}/${which}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return res.status(404).json({ error: 'backup_not_found' });
      const snap = decodeState(await r.json());
      if (!snap) return res.status(422).json({ error: 'backup_unreadable', message: 'Backup is encrypted with a different STATE_SECRET' });
      // Back up the current state first, then write the restored snapshot as a new version.
      const prev = await readState();
      try { await backupPrevState(prev); } catch {}
      const nextVersion = ((prev && prev._meta && prev._meta.version) || 0) + 1;
      const payload = {
        docs: Array.isArray(snap.docs) ? snap.docs : [],
        vendors: Array.isArray(snap.vendors) ? snap.vendors : [],
        savedSignatures: Array.isArray(snap.savedSignatures) ? snap.savedSignatures : [],
        _meta: { version: nextVersion, lastUpdated: Date.now(), by: user, exists: true, restoredFrom: which },
      };
      await writeState(payload);
      return res.status(200).json({ ok: true, _meta: payload._meta, docCount: payload.docs.length });
    } catch (e) {
      console.error('restore failed', e);
      return res.status(500).json({ error: 'server_error', message: String(e && e.message || e) });
    }
  }

  if (req.method === 'GET') {
    const data = await readState();
    if (!data) {
      return res.status(200).json({ docs: [], vendors: [], savedSignatures: [], _meta: { exists: false, encrypted: !!getStateSecret() } });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const body = await readJson(req);
    if (!body) return res.status(400).json({ error: 'invalid_json' });

    // Read current server state (fresh — bypasses the CDN edge cache).
    const prev = await readState();
    const prevVersion = (prev && prev._meta && prev._meta.version) || 0;

    // Safety net: snapshot the previous state before we overwrite it.
    try { await backupPrevState(prev); } catch (e) { /* never block the write */ }

    // Merge every collection by id — deletions travel as tombstones
    // ({_deleted, deletedAt}), the newest updatedAt/deletedAt wins per id, so
    // concurrent edits by two admins to different entities never conflict.
    const payload = {
      docs: mergeById(prev && prev.docs, body.docs),
      vendors: mergeById(prev && prev.vendors, body.vendors),
      savedSignatures: mergeById(prev && prev.savedSignatures, body.savedSignatures),
      _meta: {
        version: prevVersion + 1,
        lastUpdated: Date.now(),
        by: user,
        exists: true,
      },
    };
    try {
      await writeState(payload);
      // Return the merged state so the pushing client immediately adopts any
      // entities the other admin created/edited concurrently.
      return res.status(200).json({
        ok: true,
        _meta: payload._meta,
        mergedState: { docs: payload.docs, vendors: payload.vendors, savedSignatures: payload.savedSignatures, _meta: payload._meta },
      });
    } catch (e) {
      console.error('admin state put failed', e);
      return res.status(500).json({ error: 'server_error', message: String(e && e.message || e) });
    }
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

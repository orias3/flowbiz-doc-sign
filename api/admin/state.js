import { put, head } from '@vercel/blob';

const ADMIN_USERS = new Set([
  'orias3@gmail.com',
  'amitbens97@gmail.com',
]);
const ADMIN_PASSWORD = 'FlowBiz517268330';

// Obscure path for the shared admin state blob — avoids casual discovery via
// a guessable URL even though the blob is public-readable on Vercel.
const STATE_PATH = 'admin/_aot_shared_state_d8f3k29l.json';

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
  if (!ADMIN_USERS.has(email) || pwd !== ADMIN_PASSWORD) return null;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = authorizedEmail(req);
  if (!user) {
    res.setHeader('WWW-Authenticate', 'Basic realm="FlowBiz Admin"');
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const meta = await head(STATE_PATH);
      const r = await fetch(meta.url, { cache: 'no-store' });
      if (!r.ok) {
        return res.status(200).json({ docs: [], vendors: [], savedSignatures: [], _meta: { exists: false } });
      }
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(200).json({ docs: [], vendors: [], savedSignatures: [], _meta: { exists: false } });
    }
  }

  if (req.method === 'PUT') {
    const body = await readJson(req);
    if (!body) return res.status(400).json({ error: 'invalid_json' });
    const payload = {
      docs: Array.isArray(body.docs) ? body.docs : [],
      vendors: Array.isArray(body.vendors) ? body.vendors : [],
      savedSignatures: Array.isArray(body.savedSignatures) ? body.savedSignatures : [],
      _meta: { lastUpdated: Date.now(), by: user, exists: true },
    };
    try {
      await put(STATE_PATH, JSON.stringify(payload), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return res.status(200).json({ ok: true, _meta: payload._meta });
    } catch (e) {
      console.error('admin state put failed', e);
      return res.status(500).json({ error: 'server_error', message: String(e && e.message || e) });
    }
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

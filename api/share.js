import { put, head } from '@vercel/blob';

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function genId(len = 8) {
  let s = '';
  for (let i = 0; i < len; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return s;
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

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const id = req.query.id;

    if (req.method === 'POST') {
      const payload = await readJson(req);
      if (!payload) return res.status(400).json({ error: 'invalid_json' });
      let newId, blob;
      for (let attempt = 0; attempt < 5; attempt++) {
        newId = genId();
        try {
          blob = await put(`docs/${newId}.json`, JSON.stringify(payload), {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
            allowOverwrite: false,
          });
          break;
        } catch (e) {
          if (attempt === 4) throw e;
        }
      }
      return res.status(201).json({ id: newId, url: blob.url });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const payload = await readJson(req);
      if (!payload) return res.status(400).json({ error: 'invalid_json' });
      const blob = await put(`docs/${id}.json`, JSON.stringify(payload), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return res.status(200).json({ id, url: blob.url });
    }

    if (req.method === 'GET') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      try {
        const meta = await head(`docs/${id}.json`);
        const r = await fetch(meta.url, { cache: 'no-store' });
        if (!r.ok) throw new Error('blob fetch failed');
        const doc = await r.json();
        return res.status(200).json(doc);
      } catch (e) {
        return res.status(404).json({ error: 'not_found' });
      }
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('share api error', e);
    return res.status(500).json({ error: 'server_error', message: String(e && e.message || e) });
  }
}

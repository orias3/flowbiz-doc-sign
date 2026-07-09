// Storage + auth helpers for shared documents (docs/<id>.json blobs).
// Shared by /api/share and the reminders cron.

import { put } from '@vercel/blob';
import { createHash, randomBytes } from 'node:crypto';

export const BLOB_BASE = 'https://bjitaw3flhgszddh.public.blob.vercel-storage.com';

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function genId(len = 12) {
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return s;
}

export function sha256Hex(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

export async function readDoc(id) {
  // Cache-busting query param: the public blob URL is edge-cached, which gives
  // a read-after-write window where a just-signed doc still reads as pending.
  const r = await fetch(`${BLOB_BASE}/docs/${encodeURIComponent(id)}.json?_cb=${Date.now()}_${Math.random().toString(36).slice(2)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('fetch_failed');
  return r.json();
}

export async function writeDoc(id, payload, allowOverwrite = true) {
  return put(`docs/${id}.json`, JSON.stringify(payload), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite,
    cacheControlMaxAge: 0,
  });
}

// Owner authorization for a shared doc.
// Docs created after the security update carry ownerKeyHash; the creator got
// the matching ownerKey and must present it for structural edits / resends.
// Legacy docs (no ownerKeyHash) are grandfathered as owner-authorized so
// links and flows created before the update keep working unchanged.
export function isOwnerAuthorized(doc, providedKey) {
  if (!doc || !doc.ownerKeyHash) return true;
  if (!providedKey) return false;
  return sha256Hex(providedKey) === doc.ownerKeyHash;
}

export function isExpired(doc, now = Date.now()) {
  return !!(doc && Number(doc.expiresAt) && now > Number(doc.expiresAt));
}

// Fields the client (or anyone reading through the API) never needs.
// Signer emails are also stripped — a signing link should not leak the other
// signers' addresses.
export function publicDocView(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const { ownerKeyHash, _invites, ...rest } = doc;
  if (Array.isArray(rest.signers)) {
    rest.signers = rest.signers.map((s) => {
      if (!s || typeof s !== 'object') return s;
      const { email, ...pub } = s;
      return pub;
    });
  }
  return rest;
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '';
}

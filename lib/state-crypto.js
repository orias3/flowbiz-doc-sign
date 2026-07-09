// At-rest encryption for the shared admin state blob.
//
// Vercel Blob objects in this project are public-readable, so the state blob
// (which aggregates every document, signature and vendor) must not sit there
// in plaintext. When STATE_SECRET is set, state is written as an AES-256-GCM
// envelope; reads transparently handle both encrypted envelopes and legacy
// plaintext, so enabling the secret later never breaks existing data.
//
// IMPORTANT: once STATE_SECRET is set and a write happened, removing or
// changing the secret makes the current state unreadable (backups written
// before the change remain readable with the secret that was active then).

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ENVELOPE_MARKER = 'aes-256-gcm';

function keyFromSecret(secret) {
  return createHash('sha256').update(String(secret), 'utf8').digest();
}

export function getStateSecret() {
  const s = process.env.STATE_SECRET;
  return s && s.length >= 8 ? s : null;
}

export function isEnvelope(obj) {
  return !!(obj && typeof obj === 'object' && obj._enc === ENVELOPE_MARKER && obj.iv && obj.data && obj.tag);
}

// state object -> JSON string to store (encrypted envelope if secret set)
export function encodeState(state, secret = getStateSecret()) {
  if (!secret) return JSON.stringify(state);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(state), 'utf8');
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return JSON.stringify({
    _enc: ENVELOPE_MARKER,
    iv: iv.toString('base64'),
    data: data.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  });
}

// parsed blob JSON -> state object (handles plaintext & envelope)
// Returns null when the envelope can't be decrypted (missing/wrong secret).
export function decodeState(parsed, secret = getStateSecret()) {
  if (!isEnvelope(parsed)) return parsed;
  if (!secret) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(secret), Buffer.from(parsed.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString('utf8'));
  } catch {
    return null;
  }
}

// Shared-document API.
//
// Security model:
// - POST creates a doc and returns an ownerKey (stored only as a hash).
//   Structural edits (PUT without kind:'sign') and owner ops (PATCH) require
//   that key. Docs created before this update have no ownerKeyHash and are
//   grandfathered — their flows keep working unchanged.
// - Signers never need a key: a PUT with kind:'sign' (or any PUT that fails
//   owner auth) is treated as a SIGN SUBMISSION and goes through a restricted
//   merge that can only fill the values of fields assigned to the signer,
//   append the completion stamp, and mark completion. It can never change the
//   document structure, texts, or emails.
// - Every signature records an audit event: server time, IP, user agent and
//   a content hash of the fields at signing time.

import { sendEmail, inviteEmail, signedEmail } from '../lib/emails.js';
import {
  genId, sha256Hex, readDoc, writeDoc,
  isOwnerAuthorized, isExpired, publicDocView, clientIp,
} from '../lib/share-docs.js';

const MAX_FIELD_VALUE = 4 * 1024 * 1024; // dataURL signatures/stamps
const MAX_INVITES_PER_HOUR = 5;

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

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  return `${proto}://${host}`;
}

// Strip fields only the server may control from an incoming payload.
function stripProtected(payload) {
  const { ownerKeyHash, _invites, audit, ...rest } = payload || {};
  return rest;
}

// ── Multi-signer helpers ────────────────────────────────────────────────────
// A doc may carry doc.signers = [{ id, name, email, order, status, signedAt }].
// Fields assigned to the counterparty may carry f.signer = <signer id>; fields
// without it belong to the first signer (and legacy docs keep working since
// they have no signers array at all).

function normalizeSigners(raw, existingSigners) {
  if (!Array.isArray(raw)) return undefined;
  const prevById = new Map((existingSigners || []).filter((s) => s && s.id).map((s) => [s.id, s]));
  return raw.slice(0, 5).map((s, i) => {
    const prev = s && s.id ? prevById.get(s.id) : null;
    return {
      id: (s && typeof s.id === 'string' && s.id.slice(0, 40)) || genId(8),
      name: String((s && s.name) || '').slice(0, 80),
      email: String((s && s.email) || '').slice(0, 120),
      order: Number.isFinite(Number(s && s.order)) ? Number(s.order) : i,
      // A signature that already happened can never be undone by an owner edit.
      status: prev && prev.status === 'signed' ? 'signed' : 'pending',
      signedAt: prev && prev.status === 'signed' ? prev.signedAt : undefined,
    };
  });
}

function fieldSignerId(field, signers) {
  if (field && field.signer) return field.signer;
  return signers && signers[0] ? signers[0].id : null;
}

function nextPendingSigner(doc) {
  const signers = Array.isArray(doc.signers) ? doc.signers.filter(Boolean) : [];
  if (!signers.length) return null;
  return signers
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .find((s) => s.status !== 'signed') || null;
}

// ── The restricted sign merge ───────────────────────────────────────────────
// Exported for unit tests.
export function applySignSubmission(existing, submitted, req) {
  if (existing.status === 'completed') return { errorCode: 409, error: 'locked' };
  if (isExpired(existing)) return { errorCode: 410, error: 'expired' };

  const signers = Array.isArray(existing.signers) && existing.signers.length ? existing.signers : null;
  let signer = null;
  if (signers) {
    const signerId = submitted && submitted.signerId;
    signer = signers.find((s) => s && s.id === signerId) || null;
    if (!signer) return { errorCode: 403, error: 'unknown_signer' };
    if (signer.status === 'signed') return { errorCode: 409, error: 'already_signed' };
    const notMyTurn = signers.some((s) => s && s.id !== signer.id
      && (Number(s.order) || 0) < (Number(signer.order) || 0) && s.status !== 'signed');
    if (notMyTurn) return { errorCode: 409, error: 'not_your_turn' };
  }

  const submittedFields = new Map(
    (Array.isArray(submitted.fields) ? submitted.fields : [])
      .filter((f) => f && f.id)
      .map((f) => [f.id, f])
  );

  // Fill values of the signer's own fields — nothing else on existing fields moves.
  const fields = (existing.fields || []).map((f) => {
    if (!f || f.assignee !== 'them' || f.value) return f;
    if (signers && fieldSignerId(f, signers) !== signer.id) return f;
    const sub = submittedFields.get(f.id);
    if (!sub || typeof sub.value !== 'string' || !sub.value || sub.value.length > MAX_FIELD_VALUE) return f;
    return { ...f, value: sub.value };
  });

  // Allow the client's auto "signed digitally by … at …" stamp: appended
  // system TEXT fields only, sanitized to known props, capped.
  const existingIds = new Set((existing.fields || []).map((f) => f && f.id));
  const appended = (Array.isArray(submitted.fields) ? submitted.fields : [])
    .filter((f) => f && typeof f.id === 'string' && !existingIds.has(f.id)
      && f.assignee === 'system' && f.type === 'text'
      && typeof f.value === 'string' && f.value.length <= 400)
    .slice(0, 2)
    .map((f) => ({
      id: String(f.id).slice(0, 48), type: 'text', assignee: 'system',
      page: Number(f.page) || 0, x: Number(f.x) || 0, y: Number(f.y) || 0,
      w: Number(f.w) || 0, h: Number(f.h) || 0, value: f.value,
    }));

  const mergedFields = [...fields, ...appended];
  const signedBy = String((submitted && submitted.signedBy) || (signer && signer.name) || existing.counterparty || 'הצד השני').slice(0, 120);
  const now = Date.now();

  const auditEvent = {
    type: 'signed',
    signerId: signer ? signer.id : undefined,
    signedBy,
    at: now,
    ip: clientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    contentHash: sha256Hex(JSON.stringify(mergedFields)),
  };

  let nextSigners = existing.signers;
  let completed;
  if (signers) {
    nextSigners = signers.map((s) => (s.id === signer.id ? { ...s, status: 'signed', signedAt: now } : s));
    completed = nextSigners.every((s) => s.status === 'signed');
  } else {
    completed = submitted && submitted.status === 'completed';
  }

  const doc = {
    ...existing,
    fields: mergedFields,
    signers: nextSigners,
    audit: [...(Array.isArray(existing.audit) ? existing.audit : []), auditEvent],
    updatedAt: now,
  };
  if (completed) {
    doc.status = 'completed';
    doc.completedAt = now;
    doc.signedBy = signedBy;
  }
  return { doc, completed, signer };
}

async function sendCompletionEmails({ origin, id, doc }) {
  const targets = [];
  if (doc.clientEmail) targets.push(doc.clientEmail);
  if (doc.senderEmail) targets.push(doc.senderEmail);
  (Array.isArray(doc.signers) ? doc.signers : []).forEach((s) => {
    if (s && s.email && !targets.includes(s.email)) targets.push(s.email);
  });
  if (!targets.length) return;
  const tpl = signedEmail({ origin, id, doc });
  await Promise.all(targets.map((to) => sendEmail({ to, ...tpl })));
}

// Rate-limit invite emails per doc: sliding one-hour window.
function checkInviteBudget(doc, now = Date.now()) {
  const windowStart = now - 60 * 60 * 1000;
  const recent = (Array.isArray(doc._invites) ? doc._invites : []).filter((t) => Number(t) > windowStart);
  if (recent.length >= MAX_INVITES_PER_HOUR) return { ok: false, recent };
  return { ok: true, recent: [...recent, now] };
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const id = req.query.id;
    const origin = getOrigin(req);

    if (req.method === 'POST') {
      const payload = stripProtected(await readJson(req));
      if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'invalid_json' });

      const ownerKey = genId(24);
      payload.ownerKeyHash = sha256Hex(ownerKey);
      payload.sentAt = Date.now();
      if (Array.isArray(payload.signers)) {
        payload.signers = normalizeSigners(payload.signers, []);
      }
      if (payload.expiresAt != null) {
        const exp = Number(payload.expiresAt);
        if (Number.isFinite(exp) && exp > Date.now()) payload.expiresAt = exp;
        else delete payload.expiresAt;
      }

      let newId, blob;
      for (let attempt = 0; attempt < 5; attempt++) {
        newId = genId();
        try {
          blob = await writeDoc(newId, payload, false);
          break;
        } catch (e) {
          if (attempt === 4) throw e;
        }
      }
      return res.status(201).json({ id: newId, url: blob.url, ownerKey });
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const patch = await readJson(req);
      if (!patch) return res.status(400).json({ error: 'invalid_json' });
      let existing;
      try { existing = await readDoc(id); }
      catch { return res.status(404).json({ error: 'not_found' }); }

      if (!isOwnerAuthorized(existing, patch.ownerKey)) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const merged = { ...existing };
      if (patch.clientEmail !== undefined) merged.clientEmail = String(patch.clientEmail || '').slice(0, 120);
      if (patch.senderEmail !== undefined) merged.senderEmail = String(patch.senderEmail || '').slice(0, 120);
      if (patch.expiresAt !== undefined) {
        const exp = Number(patch.expiresAt);
        if (patch.expiresAt === null || !Number.isFinite(exp) || exp <= 0) delete merged.expiresAt;
        else merged.expiresAt = exp;
      }
      if (patch.signers !== undefined) {
        const normalized = normalizeSigners(patch.signers, existing.signers);
        if (normalized) merged.signers = normalized;
        else delete merged.signers;
      }

      // kind=invite → email the signing link (rate-limited per doc).
      if (patch.kind === 'invite') {
        const target = patch.signerId
          ? (merged.signers || []).find((s) => s && s.id === patch.signerId)
          : null;
        const to = (target && target.email) || merged.clientEmail;
        if (to) {
          const budget = checkInviteBudget(merged);
          if (!budget.ok) {
            await writeDoc(id, merged, true);
            return res.status(429).json({ error: 'too_many_invites' });
          }
          merged._invites = budget.recent;
          await writeDoc(id, merged, true);
          const { sent, reason, detail } = await sendEmail({
            to,
            ...inviteEmail({ origin, id, doc: merged, signerName: target && target.name }),
          });
          if (!sent && reason === 'not_configured') {
            return res.status(503).json({ error: 'email_not_configured' });
          }
          if (!sent) {
            return res.status(502).json({ error: 'send_failed', detail });
          }
          return res.status(200).json({ ok: true, sent: true });
        }
      }

      await writeDoc(id, merged, true);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const payload = await readJson(req);
      if (!payload) return res.status(400).json({ error: 'invalid_json' });

      let prev = null;
      try { prev = await readDoc(id); } catch {}
      if (!prev) return res.status(404).json({ error: 'not_found' });

      const ownerEdit = payload.kind !== 'sign'
        && isOwnerAuthorized(prev, payload.ownerKey);

      if (!ownerEdit) {
        // ── Sign submission (restricted merge) ──
        const result = applySignSubmission(prev, payload, req);
        if (result.errorCode) {
          return res.status(result.errorCode).json({ error: result.error });
        }
        await writeDoc(id, result.doc, true);

        if (result.completed) {
          await sendCompletionEmails({ origin, id, doc: result.doc });
        } else if (result.signer) {
          // Sequential flow: this signer is done, invite the next one.
          const next = nextPendingSigner(result.doc);
          if (next && next.email) {
            await sendEmail({
              to: next.email,
              ...inviteEmail({ origin, id, doc: result.doc, signerName: next.name }),
            });
          }
        }
        return res.status(200).json({ id, ok: true, completed: !!result.completed });
      }

      // ── Owner full edit ──
      if (prev.status === 'completed') {
        return res.status(409).json({ error: 'locked', message: 'Document is already signed and locked' });
      }
      const clean = stripProtected(payload);
      delete clean.kind;
      delete clean.ownerKey;
      const merged = { ...(prev || {}), ...clean };
      if (clean.signers !== undefined) {
        const normalized = normalizeSigners(clean.signers, prev && prev.signers);
        if (normalized) merged.signers = normalized;
        else delete merged.signers;
      }
      await writeDoc(id, merged, true);

      if (merged.status === 'completed') {
        await sendCompletionEmails({ origin, id, doc: merged });
      }

      return res.status(200).json({ id, ok: true });
    }

    if (req.method === 'GET') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      try {
        const doc = await readDoc(id);
        if (isExpired(doc) && doc.status !== 'completed') {
          return res.status(410).json({ error: 'expired' });
        }
        return res.status(200).json(publicDocView(doc));
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

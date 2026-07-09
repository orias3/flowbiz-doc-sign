// Daily reminder cron (configured in vercel.json).
//
// Finds docs that are still waiting for a signature and nudges the signer by
// email. Conservative by design:
//   - only docs created after the reminders feature (they carry sentAt)
//   - first reminder 3 days after sending, then one more after 3 more days
//   - max 2 reminders per doc, never for completed/expired docs
//
// Protected by CRON_SECRET (Vercel sends it as a Bearer token automatically
// when the env var is set).

import { list } from '@vercel/blob';
import { sendEmail, reminderEmail } from '../../lib/emails.js';
import { readDoc, writeDoc, isExpired } from '../../lib/share-docs.js';

const FIRST_REMINDER_MS = 3 * 24 * 60 * 60 * 1000;
const REMINDER_GAP_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_REMINDERS = 2;
const MAX_DOC_AGE_MS = 60 * 24 * 60 * 60 * 1000; // stop nagging after 60 days

function reminderTarget(doc) {
  const signers = Array.isArray(doc.signers) ? doc.signers.filter(Boolean) : [];
  if (signers.length) {
    const next = signers
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
      .find((s) => s.status !== 'signed');
    return next && next.email ? next.email : null;
  }
  return doc.clientEmail || null;
}

function isDue(doc, now) {
  if (!doc || doc.status === 'completed') return false;
  if (isExpired(doc, now)) return false;
  const sentAt = Number(doc.sentAt) || 0;
  if (!sentAt) return false; // legacy doc — never auto-remind
  if (now - sentAt > MAX_DOC_AGE_MS) return false;
  const reminders = Array.isArray(doc._reminders) ? doc._reminders : [];
  if (reminders.length >= MAX_REMINDERS) return false;
  const last = reminders.length ? Math.max(...reminders.map(Number)) : 0;
  const threshold = reminders.length ? last + REMINDER_GAP_MS : sentAt + FIRST_REMINDER_MS;
  return now >= threshold;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const now = Date.now();
  const sent = [];
  const errors = [];

  try {
    const { blobs } = await list({ prefix: 'docs/', limit: 1000 });
    for (const blob of blobs || []) {
      const m = blob.pathname.match(/^docs\/([a-z0-9]+)\.json$/i);
      if (!m) continue;
      // Cheap pre-filter: skip blobs older than the nag window entirely.
      if (blob.uploadedAt && now - new Date(blob.uploadedAt).getTime() > MAX_DOC_AGE_MS) continue;
      const id = m[1];
      try {
        const doc = await readDoc(id);
        if (!isDue(doc, now)) continue;
        const to = reminderTarget(doc);
        if (!to) continue;
        const result = await sendEmail({ to, ...reminderEmail({ origin, id, doc }) });
        if (result.sent) {
          const reminders = Array.isArray(doc._reminders) ? doc._reminders : [];
          await writeDoc(id, { ...doc, _reminders: [...reminders, now] }, true);
          sent.push(id);
        } else if (result.reason === 'not_configured') {
          return res.status(200).json({ ok: false, reason: 'email_not_configured' });
        }
      } catch (e) {
        errors.push({ id, error: String(e && e.message || e) });
      }
    }
    return res.status(200).json({ ok: true, sent, errors });
  } catch (e) {
    console.error('reminders cron failed', e);
    return res.status(500).json({ error: 'server_error', message: String(e && e.message || e) });
  }
}

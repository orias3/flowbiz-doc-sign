import { put } from '@vercel/blob';
import nodemailer from 'nodemailer';

const BLOB_BASE = 'https://bjitaw3flhgszddh.public.blob.vercel-storage.com';

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

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  return `${proto}://${host}`;
}

let cachedTransport = null;
function getTransport() {
  if (cachedTransport) return cachedTransport;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cachedTransport;
}

async function sendEmail({ to, subject, html }) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  const transport = getTransport();
  if (!transport) return { sent: false, reason: 'not_configured' };
  const user = process.env.GMAIL_USER;
  const from = process.env.EMAIL_FROM || `FlowBiz Sign <${user}>`;
  try {
    await transport.sendMail({ from, to, subject, html });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: 'send_failed', detail: String(e && e.message || e) };
  }
}

function rtlEmailShell({ heading, bodyHtml, ctaLabel, ctaUrl, ctaColor, link, sender }) {
  // Gmail strips <html>/<head> and ignores some CSS. Use table-based layout with
  // dir="rtl" + text-align:right on every text-bearing cell, and inline styles.
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body dir="rtl" style="margin:0;padding:0;background:#F4F9FF;direction:rtl;text-align:right;font-family:'Heebo','Arial Hebrew',Arial,sans-serif;color:#0E2A5C;">
  <div dir="rtl" style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${heading}</div>
  <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F9FF;direction:rtl;">
    <tr>
      <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
        <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;direction:rtl;">
          <tr>
            <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
              <h2 dir="rtl" style="margin:0 0 8px;color:#0E2A5C;font-size:20px;font-weight:800;direction:rtl;text-align:right;">${heading}</h2>
              <div dir="rtl" style="color:#4B5463;font-size:14px;line-height:1.6;margin:0 0 22px;direction:rtl;text-align:right;">${bodyHtml}</div>
              <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 18px;direction:rtl;">
                <tr><td align="center" dir="rtl" style="direction:rtl;">
                  <a href="${ctaUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:999px;font-weight:700;font-size:14.5px;font-family:'Heebo','Arial Hebrew',Arial,sans-serif;">${ctaLabel}</a>
                </td></tr>
              </table>
              <p dir="rtl" style="color:#6B7687;font-size:12px;margin:0 0 6px;direction:rtl;text-align:right;">או הדבק/י את הקישור בדפדפן:</p>
              <p style="direction:ltr;text-align:left;margin:0 0 18px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:#1569DB;word-break:break-all;"><a href="${link}" style="color:#1569DB;text-decoration:underline;">${link}</a></p>
              <hr style="border:none;border-top:1px solid #ECF0F6;margin:18px 0;"/>
              <p dir="rtl" style="color:#9BA7B7;font-size:11.5px;margin:0;direction:rtl;text-align:right;">נשלח דרך FlowBiz Sign · ${sender} · חיבור מאובטח</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function inviteEmail({ origin, id, doc }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך לחתימה';
  return {
    subject: `מסמך לחתימה: ${docName}`,
    html: rtlEmailShell({
      heading: 'קיבלת מסמך לחתימה',
      bodyHtml: `${sender} שלח/ה אליך את <strong>${docName}</strong> לחתימה דיגיטלית. לחץ/י על הכפתור כדי לפתוח את המסמך, לחתום ולהחזיר.`,
      ctaLabel: 'פתח/י מסמך לחתימה',
      ctaUrl: link,
      ctaColor: '#1B84FF',
      link,
      sender,
    }),
  };
}

function signedEmail({ origin, id, doc }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך חתום';
  return {
    subject: `המסמך נחתם: ${docName}`,
    html: rtlEmailShell({
      heading: 'המסמך נחתם בהצלחה',
      bodyHtml: `התהליך הסתיים. הקובץ <strong>${docName}</strong> נחתם וחזר אל ${sender}. אפשר להוריד עותק חתום מהקישור למטה.`,
      ctaLabel: 'פתח/י עותק חתום',
      ctaUrl: link,
      ctaColor: '#22C37E',
      link,
      sender,
    }),
  };
}

async function readDoc(id) {
  const r = await fetch(`${BLOB_BASE}/docs/${id}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error('fetch_failed');
  return r.json();
}

async function writeDoc(id, payload, allowOverwrite = true) {
  return put(`docs/${id}.json`, JSON.stringify(payload), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite,
  });
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
      const payload = await readJson(req);
      if (!payload) return res.status(400).json({ error: 'invalid_json' });
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
      return res.status(201).json({ id: newId, url: blob.url });
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const patch = await readJson(req);
      if (!patch) return res.status(400).json({ error: 'invalid_json' });
      let existing;
      try { existing = await readDoc(id); }
      catch { return res.status(404).json({ error: 'not_found' }); }

      const merged = { ...existing };
      if (patch.clientEmail !== undefined) merged.clientEmail = patch.clientEmail;
      if (patch.senderEmail !== undefined) merged.senderEmail = patch.senderEmail;
      await writeDoc(id, merged, true);

      // If kind=invite and we have an email, send the invite link
      if (patch.kind === 'invite' && merged.clientEmail) {
        const { sent, reason, detail } = await sendEmail({
          to: merged.clientEmail,
          ...inviteEmail({ origin, id, doc: merged }),
        });
        if (!sent && reason === 'not_configured') {
          return res.status(503).json({ error: 'email_not_configured' });
        }
        if (!sent) {
          return res.status(502).json({ error: 'send_failed', detail });
        }
        return res.status(200).json({ ok: true, sent: true });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const payload = await readJson(req);
      if (!payload) return res.status(400).json({ error: 'invalid_json' });

      // Merge with existing to preserve clientEmail/senderEmail set via PATCH
      let prev = null;
      try { prev = await readDoc(id); } catch {}
      const merged = { ...(prev || {}), ...payload };

      // Server-side lock: once completed, do not allow further structural edits.
      if (prev && prev.status === 'completed') {
        return res.status(409).json({ error: 'locked', message: 'Document is already signed and locked' });
      }
      await writeDoc(id, merged, true);

      // If newly completed, email the client (and sender) if RESEND configured.
      if (merged.status === 'completed') {
        const targets = [];
        if (merged.clientEmail) targets.push(merged.clientEmail);
        if (merged.senderEmail) targets.push(merged.senderEmail);
        const tpl = signedEmail({ origin, id, doc: merged });
        await Promise.all(targets.map((to) => sendEmail({ to, ...tpl })));
      }

      return res.status(200).json({ id, ok: true });
    }

    if (req.method === 'GET') {
      if (!id) return res.status(400).json({ error: 'missing_id' });
      try {
        const doc = await readDoc(id);
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

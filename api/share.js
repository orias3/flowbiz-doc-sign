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

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  return `${proto}://${host}`;
}

async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return { sent: false, reason: 'not_configured' };
  const from = process.env.EMAIL_FROM || 'FlowBiz Sign <onboarding@resend.dev>';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      return { sent: false, reason: 'send_failed', detail: errText };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: 'send_failed', detail: String(e && e.message || e) };
  }
}

function inviteEmail({ origin, id, doc }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך לחתימה';
  return {
    subject: `מסמך לחתימה: ${docName}`,
    html: `<!doctype html><html dir="rtl" lang="he"><body style="font-family: Arial, sans-serif; background:#F4F9FF; padding:24px; color:#0E2A5C;">
      <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:16px; padding:28px; box-shadow:0 4px 18px rgba(14,42,92,.08)">
        <h2 style="margin:0 0 8px;color:#0E2A5C;">קיבלת מסמך לחתימה</h2>
        <p style="color:#4B5463; font-size:14px; line-height:1.55; margin:0 0 18px;">
          ${sender} שלח/ה אליך את <strong>${docName}</strong> לחתימה דיגיטלית. לחץ/י על הכפתור כדי לפתוח את המסמך, לחתום ולהחזיר.
        </p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${link}" style="display:inline-block; background:#1B84FF; color:#fff; text-decoration:none; padding:12px 28px; border-radius:999px; font-weight:700;">פתח/י מסמך לחתימה</a>
        </p>
        <p style="color:#6B7687; font-size:12px; margin:0;">או הדבק/י קישור בדפדפן: <span style="direction:ltr; display:inline-block;">${link}</span></p>
        <hr style="border:none; border-top:1px solid #ECF0F6; margin: 22px 0;"/>
        <p style="color:#9BA7B7; font-size:11.5px; margin:0;">נשלח דרך FlowBiz Sign · חיבור מאובטח</p>
      </div>
    </body></html>`,
  };
}

function signedEmail({ origin, id, doc }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך חתום';
  return {
    subject: `המסמך נחתם: ${docName}`,
    html: `<!doctype html><html dir="rtl" lang="he"><body style="font-family: Arial, sans-serif; background:#F4F9FF; padding:24px; color:#0E2A5C;">
      <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:16px; padding:28px; box-shadow:0 4px 18px rgba(14,42,92,.08)">
        <h2 style="margin:0 0 8px;color:#0E2A5C;">המסמך נחתם בהצלחה</h2>
        <p style="color:#4B5463; font-size:14px; line-height:1.55; margin:0 0 18px;">
          התהליך הסתיים. הקובץ <strong>${docName}</strong> נחתם וחזר אל ${sender}. אפשר להוריד עותק חתום מהקישור למטה.
        </p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${link}" style="display:inline-block; background:#22C37E; color:#fff; text-decoration:none; padding:12px 28px; border-radius:999px; font-weight:700;">פתח/י עותק חתום</a>
        </p>
        <hr style="border:none; border-top:1px solid #ECF0F6; margin: 22px 0;"/>
        <p style="color:#9BA7B7; font-size:11.5px; margin:0;">נשלח דרך FlowBiz Sign · חיבור מאובטח</p>
      </div>
    </body></html>`,
  };
}

async function readDoc(id) {
  const meta = await head(`docs/${id}.json`);
  const r = await fetch(meta.url, { cache: 'no-store' });
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

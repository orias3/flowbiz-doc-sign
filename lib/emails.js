// Email templates + Gmail transport, shared by the share API and the
// reminders cron. All user-controlled strings (doc name, sender name) are
// HTML-escaped before interpolation — the share endpoint is reachable without
// login, so nothing coming from a request body may be trusted as markup.

import nodemailer from 'nodemailer';

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let cachedTransport = null;
export function getTransport() {
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

export async function sendEmail({ to, subject, html }) {
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

// Colours follow the FlowBiz design system (Oct 2026): notebook canvas,
// ink text, flag-blue action, money-green for a completed signature.
export function rtlEmailShell({ heading, bodyHtml, ctaLabel, ctaUrl, ctaColor, link, sender, logoUrl }) {
  // Gmail strips <html>/<head> and ignores some CSS. Use table-based layout with
  // dir="rtl" + text-align:right on every text-bearing cell, and inline styles.
  // `heading`, `ctaLabel`, `sender` are escaped here; `bodyHtml` is trusted
  // template markup whose interpolated values must be escaped by the caller.
  const safeHeading = escapeHtml(heading);
  const safeSender = escapeHtml(sender);
  const safeLink = escapeHtml(link);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const logoRow = logoUrl
    ? `<tr><td dir="rtl" style="padding:24px 28px 0;direction:rtl;text-align:right;"><img src="${escapeHtml(logoUrl)}" alt="FlowBiz" height="44" style="display:block;height:44px;width:auto;border:0;"/></td></tr>`
    : '';
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body dir="rtl" style="margin:0;padding:0;background:#F7F5EF;direction:rtl;text-align:right;font-family:'Assistant','Arial Hebrew',Arial,sans-serif;color:#2D3E66;">
  <div dir="rtl" style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeHeading}</div>
  <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F7F5EF;direction:rtl;">
    <tr>
      <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
        <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#FFFEFB;border:1px solid #E7E1D5;border-radius:18px;direction:rtl;">
          ${logoRow}
          <tr>
            <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
              <div style="width:48px;height:3px;background:#0038B8;border-radius:2px;margin:0 0 12px;"></div>
              <h2 dir="rtl" style="margin:0 0 8px;color:#2D3E66;font-family:'Rubik','Assistant','Arial Hebrew',Arial,sans-serif;font-size:21px;font-weight:800;direction:rtl;text-align:right;">${safeHeading}</h2>
              <div dir="rtl" style="color:#4A5878;font-size:15px;line-height:1.65;margin:0 0 22px;direction:rtl;text-align:right;">${bodyHtml}</div>
              <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 18px;direction:rtl;">
                <tr><td align="center" dir="rtl" style="direction:rtl;">
                  <a href="${safeCtaUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:14px;font-weight:700;font-size:15px;font-family:'Assistant','Arial Hebrew',Arial,sans-serif;">${escapeHtml(ctaLabel)}</a>
                </td></tr>
              </table>
              <p dir="rtl" style="color:#5F6775;font-size:12px;margin:0 0 6px;direction:rtl;text-align:right;">אפשר גם להעתיק את הקישור לדפדפן:</p>
              <p style="direction:ltr;text-align:left;margin:0 0 18px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:#0038B8;word-break:break-all;"><a href="${safeLink}" style="color:#0038B8;text-decoration:underline;">${safeLink}</a></p>
              <hr style="border:none;border-top:1px solid #E7E1D5;margin:18px 0;"/>
              <p dir="rtl" style="color:#A0A6AF;font-size:11.5px;margin:0;direction:rtl;text-align:right;">נשלח דרך FlowBiz Sign · ${safeSender} · חיבור מאובטח</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function inviteEmail({ origin, id, doc, signerName }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך לחתימה';
  const hello = signerName ? `שלום ${escapeHtml(signerName)}, ` : '';
  return {
    subject: `מסמך לחתימה: ${docName}`,
    html: rtlEmailShell({
      heading: 'קיבלת מסמך לחתימה',
      bodyHtml: `${hello}${escapeHtml(sender)} שלח אליך את <strong>${escapeHtml(docName)}</strong> לחתימה דיגיטלית. הכפתור פותח את המסמך, ושם חותמים ומחזירים בכמה לחיצות.`,
      ctaLabel: 'לפתיחת המסמך',
      ctaUrl: link,
      ctaColor: '#0038B8',
      link,
      sender,
      logoUrl: `${origin}/assets/logo.png`,
    }),
  };
}

export function signedEmail({ origin, id, doc }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך חתום';
  return {
    subject: `המסמך נחתם: ${docName}`,
    html: rtlEmailShell({
      heading: 'המסמך נחתם בהצלחה',
      bodyHtml: `התהליך הסתיים. הקובץ <strong>${escapeHtml(docName)}</strong> נחתם וחזר אל ${escapeHtml(sender)}. אפשר להוריד עותק חתום מהקישור למטה.`,
      ctaLabel: 'לעותק החתום',
      ctaUrl: link,
      ctaColor: '#12805C',
      link,
      sender,
      logoUrl: `${origin}/assets/logo.png`,
    }),
  };
}

export function reminderEmail({ origin, id, doc }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך לחתימה';
  return {
    subject: `תזכורת: מסמך ממתין לחתימתך, ${docName}`,
    html: rtlEmailShell({
      heading: 'תזכורת ידידותית 🖊️',
      bodyHtml: `המסמך <strong>${escapeHtml(docName)}</strong> מאת ${escapeHtml(sender)} עדיין ממתין לחתימתך. זה לוקח פחות מדקה: לחיצה על הכפתור, חתימה, וסיימנו.`,
      ctaLabel: 'לחתימה על המסמך',
      ctaUrl: link,
      ctaColor: '#0038B8',
      link,
      sender,
      logoUrl: `${origin}/assets/logo.png`,
    }),
  };
}

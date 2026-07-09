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

export function rtlEmailShell({ heading, bodyHtml, ctaLabel, ctaUrl, ctaColor, link, sender }) {
  // Gmail strips <html>/<head> and ignores some CSS. Use table-based layout with
  // dir="rtl" + text-align:right on every text-bearing cell, and inline styles.
  // `heading`, `ctaLabel`, `sender` are escaped here; `bodyHtml` is trusted
  // template markup whose interpolated values must be escaped by the caller.
  const safeHeading = escapeHtml(heading);
  const safeSender = escapeHtml(sender);
  const safeLink = escapeHtml(link);
  const safeCtaUrl = escapeHtml(ctaUrl);
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body dir="rtl" style="margin:0;padding:0;background:#F4F9FF;direction:rtl;text-align:right;font-family:'Heebo','Arial Hebrew',Arial,sans-serif;color:#0E2A5C;">
  <div dir="rtl" style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeHeading}</div>
  <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F9FF;direction:rtl;">
    <tr>
      <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
        <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;direction:rtl;">
          <tr>
            <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
              <h2 dir="rtl" style="margin:0 0 8px;color:#0E2A5C;font-size:20px;font-weight:800;direction:rtl;text-align:right;">${safeHeading}</h2>
              <div dir="rtl" style="color:#4B5463;font-size:14px;line-height:1.6;margin:0 0 22px;direction:rtl;text-align:right;">${bodyHtml}</div>
              <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 18px;direction:rtl;">
                <tr><td align="center" dir="rtl" style="direction:rtl;">
                  <a href="${safeCtaUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:999px;font-weight:700;font-size:14.5px;font-family:'Heebo','Arial Hebrew',Arial,sans-serif;">${escapeHtml(ctaLabel)}</a>
                </td></tr>
              </table>
              <p dir="rtl" style="color:#6B7687;font-size:12px;margin:0 0 6px;direction:rtl;text-align:right;">או הדבק/י את הקישור בדפדפן:</p>
              <p style="direction:ltr;text-align:left;margin:0 0 18px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:#1569DB;word-break:break-all;"><a href="${safeLink}" style="color:#1569DB;text-decoration:underline;">${safeLink}</a></p>
              <hr style="border:none;border-top:1px solid #ECF0F6;margin:18px 0;"/>
              <p dir="rtl" style="color:#9BA7B7;font-size:11.5px;margin:0;direction:rtl;text-align:right;">נשלח דרך FlowBiz Sign · ${safeSender} · חיבור מאובטח</p>
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
      bodyHtml: `${hello}${escapeHtml(sender)} שלח/ה אליך את <strong>${escapeHtml(docName)}</strong> לחתימה דיגיטלית. לחץ/י על הכפתור כדי לפתוח את המסמך, לחתום ולהחזיר.`,
      ctaLabel: 'פתח/י מסמך לחתימה',
      ctaUrl: link,
      ctaColor: '#1B84FF',
      link,
      sender,
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
      ctaLabel: 'פתח/י עותק חתום',
      ctaUrl: link,
      ctaColor: '#22C37E',
      link,
      sender,
    }),
  };
}

export function reminderEmail({ origin, id, doc }) {
  const link = `${origin}/s/${id}`;
  const sender = (doc && doc.sender) || 'FlowBiz Sign';
  const docName = (doc && doc.name) || 'מסמך לחתימה';
  return {
    subject: `תזכורת — מסמך ממתין לחתימתך: ${docName}`,
    html: rtlEmailShell({
      heading: 'תזכורת ידידותית 🖊️',
      bodyHtml: `המסמך <strong>${escapeHtml(docName)}</strong> מאת ${escapeHtml(sender)} עדיין ממתין לחתימתך. זה לוקח פחות מדקה — לחיצה על הכפתור, חתימה, וסיימנו.`,
      ctaLabel: 'לחתימה על המסמך',
      ctaUrl: link,
      ctaColor: '#1B84FF',
      link,
      sender,
    }),
  };
}

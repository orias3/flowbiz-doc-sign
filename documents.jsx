// Document templates — three demo docs rendered as HTML pages.

const DOC_TEMPLATES = {
  service_agreement: {
    name: "הסכם שירותי ייעוץ דיגיטלי",
    category: "הסכם",
    counterparty: "סטודיו לעיצוב מאיה ברק",
    pages: 2,
    render: (page) => page === 0 ? (
      <div className="page-content">
        <h1>הסכם שירותי ייעוץ דיגיטלי</h1>
        <div className="meta-line">תאריך עריכה: 14 במאי 2026 · מסמך מס' 2026-118</div>
        <div className="party-row">
          <div className="party-box">
            <div className="lbl">המזמין</div>
            <div className="val">או או טו סטראטעפס בע״מ</div>
            <div className="val" style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: 12 }}>ח.פ. 517268330</div>
          </div>
          <div className="party-box">
            <div className="lbl">הספק</div>
            <div className="val">סטודיו לעיצוב מאיה ברק</div>
            <div className="val" style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: 12 }}>ע.מ. 028471639</div>
          </div>
        </div>
        <h2>1. מהות ההתקשרות</h2>
        <p>הספק יעניק למזמין שירותי ייעוץ ועיצוב גרפי במסגרת פרויקט מיתוג חדש לרשת בתי הקפה של המזמין. השירות יכלול גיבוש שפה חזותית, עיצוב לוגו ראשי, ערכת אייקונים, מערכת צבעים, מערכת טיפוגרפיה, ושני סבבים של התאמות לפי בקשת המזמין.</p>
        <h2>2. תקופת ההתקשרות</h2>
        <p>ההסכם תקף מיום החתימה ועד למסירת התוצרים הסופיים, וזאת לא יאוחר מ-90 יום קלנדריים מיום החתימה. ניתן להאריך את תקופת ההתקשרות בכתב ובהסכמת שני הצדדים.</p>
        <h2>3. תמורה ולוח תשלומים</h2>
        <table>
          <thead>
            <tr><th>שלב</th><th>תיאור</th><th style={{ textAlign: 'left' }}>תמורה</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>מקדמה בעת חתימת ההסכם</td><td style={{ textAlign: 'left' }}>₪4,500</td></tr>
            <tr><td>2</td><td>מסירת דרפט ראשון ואישור כיוון</td><td style={{ textAlign: 'left' }}>₪3,500</td></tr>
            <tr><td>3</td><td>מסירת תוצרים סופיים</td><td style={{ textAlign: 'left' }}>₪4,000</td></tr>
          </tbody>
          <tfoot>
            <tr><td colSpan="2">סה"כ (לא כולל מע"מ)</td><td style={{ textAlign: 'left' }}>₪12,000</td></tr>
          </tfoot>
        </table>
        <h2>4. קניין רוחני</h2>
        <p>זכויות הקניין הרוחני בתוצרים הסופיים יועברו במלואן למזמין עם השלמת התשלום האחרון. הספק שומר לעצמו את הזכות להציג את העבודה בתיק העבודות שלו.</p>
      </div>
    ) : (
      <div className="page-content">
        <h2>5. סודיות</h2>
        <p>שני הצדדים מתחייבים לשמור בסודיות מוחלטת כל מידע עסקי, רעיון, או חומר שיועבר ביניהם במסגרת ההתקשרות, בין אם המידע סומן כסודי ובין אם לאו, וזאת לתקופה של 36 חודשים ממועד סיום ההתקשרות.</p>
        <h2>6. ביטול ההסכם</h2>
        <p>כל אחד מהצדדים רשאי להפסיק את ההתקשרות בהודעה מוקדמת של 14 ימים בכתב. במקרה של הפסקה, יישא המזמין בעלות העבודה שבוצעה עד למועד ההפסקה, בכפוף לאישור היקף ביצוע על ידי שני הצדדים.</p>
        <h2>7. סמכות שיפוט</h2>
        <p>סמכות השיפוט הבלעדית בכל מחלוקת הנובעת מהסכם זה תהיה נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו. על ההסכם יחולו דיני מדינת ישראל בלבד.</p>
        <h2>8. כללי</h2>
        <ol>
          <li>הסכם זה מהווה את מלוא ההסכמות בין הצדדים ומבטל כל הסכם או הבנה קודמים, בעל פה או בכתב.</li>
          <li>כל שינוי בהסכם זה ייעשה בכתב ובחתימת שני הצדדים בלבד.</li>
          <li>אי-אכיפה של זכות כלשהי לפי הסכם זה לא תיחשב כוויתור עליה.</li>
        </ol>
        <p style={{ marginTop: 28 }}>ולראיה באו הצדדים על החתום:</p>
        <div className="signoff">
          <div className="signoff-block">
            <div className="lbl">המזמין</div>
            <div className="line">חתימה וחותמת</div>
          </div>
          <div className="signoff-block">
            <div className="lbl">הספק</div>
            <div className="line">חתימה</div>
          </div>
        </div>
      </div>
    )
  },

  price_quote: {
    name: "הצעת מחיר #2026-041",
    category: "הצעת מחיר",
    counterparty: "דניאל לוי - לקוח",
    pages: 1,
    render: () => (
      <div className="page-content">
        <h1>הצעת מחיר</h1>
        <div className="meta-line">מס' הצעה: 2026-041 · תוקף ההצעה: 30 ימים</div>
        <div className="party-row">
          <div className="party-box">
            <div className="lbl">מאת</div>
            <div className="val">או או טו סטראטעפס בע״מ</div>
          </div>
          <div className="party-box">
            <div className="lbl">לכבוד</div>
            <div className="val">דניאל לוי</div>
          </div>
        </div>
        <h2>פירוט השירות</h2>
        <p>הצעת מחיר עבור הקמת אתר תדמית כולל מערכת ניהול תוכן, אופטימיזציה למובייל, ואינטגרציה עם מערכת CRM קיימת.</p>
        <table>
          <thead>
            <tr><th>פריט</th><th style={{ textAlign: 'center' }}>כמות</th><th style={{ textAlign: 'left' }}>סכום</th></tr>
          </thead>
          <tbody>
            <tr><td>אפיון UX ומפת אתר</td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'left' }}>₪2,800</td></tr>
            <tr><td>עיצוב 6 עמודים</td><td style={{ textAlign: 'center' }}>6</td><td style={{ textAlign: 'left' }}>₪5,400</td></tr>
            <tr><td>פיתוח ואינטגרציה</td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'left' }}>₪7,800</td></tr>
            <tr><td>בדיקות והעלאה לאוויר</td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'left' }}>₪1,200</td></tr>
          </tbody>
          <tfoot>
            <tr><td colSpan="2">סה"כ לפני מע"מ</td><td style={{ textAlign: 'left' }}>₪17,200</td></tr>
            <tr><td colSpan="2">מע"מ 17%</td><td style={{ textAlign: 'left' }}>₪2,924</td></tr>
            <tr><td colSpan="2" style={{ fontSize: 15 }}>סה"כ לתשלום</td><td style={{ textAlign: 'left', fontSize: 15 }}>₪20,124</td></tr>
          </tfoot>
        </table>
        <h2>תנאי תשלום</h2>
        <ol>
          <li>50% מקדמה במעמד חתימת ההצעה.</li>
          <li>50% עם העלאת האתר לאוויר.</li>
          <li>תשלום בהעברה בנקאית או בצ׳ק לפקודת או או טו סטראטעפס בע״מ.</li>
        </ol>
        <p style={{ marginTop: 18 }}>אישור ההצעה מהווה הסכמה לתנאים המפורטים לעיל ולתנאי השירות הכלליים שלנו.</p>
        <div className="signoff">
          <div className="signoff-block">
            <div className="lbl">חתימת הספק</div>
            <div className="line">או או טו סטראטעפס בע״מ</div>
          </div>
          <div className="signoff-block">
            <div className="lbl">אישור הלקוח</div>
            <div className="line">חתימה ותאריך</div>
          </div>
        </div>
      </div>
    )
  },

  nda: {
    name: "הסכם סודיות הדדי (NDA)",
    category: "NDA",
    counterparty: "Cloudwave Solutions",
    pages: 1,
    render: () => (
      <div className="page-content">
        <h1>הסכם סודיות הדדי</h1>
        <div className="meta-line">Non-Disclosure Agreement · גרסה 2.1</div>
        <div className="party-row">
          <div className="party-box"><div className="lbl">צד א'</div><div className="val">או או טו סטראטעפס בע״מ</div></div>
          <div className="party-box"><div className="lbl">צד ב'</div><div className="val">Cloudwave Solutions Ltd.</div></div>
        </div>
        <h2>1. הגדרת מידע סודי</h2>
        <p>"מידע סודי" משמעו כל מידע עסקי, טכנולוגי, כספי, שיווקי, או כל מידע אחר שיועבר בין הצדדים במסגרת בחינת שיתוף פעולה אפשרי, בין אם נמסר בכתב, בעל פה, או באופן אלקטרוני.</p>
        <h2>2. התחייבות לסודיות</h2>
        <p>שני הצדדים מתחייבים: (א) לשמור על המידע הסודי בסודיות מוחלטת; (ב) לא לעשות במידע הסודי כל שימוש שאינו לצורך בחינת שיתוף הפעולה; (ג) להגביל את הגישה למידע הסודי לעובדים ויועצים אשר חתמו על התחייבות סודיות דומה.</p>
        <h2>3. חריגים</h2>
        <p>החובות לפי הסכם זה לא יחולו על מידע אשר: (א) היה ידוע באופן ציבורי טרם מסירתו; (ב) הפך לידוע ציבורית שלא בעקבות הפרת הסכם זה; (ג) פותח באופן עצמאי על ידי הצד המקבל; (ד) נדרש לגילוי על פי דין או צו שיפוטי.</p>
        <h2>4. תקופה</h2>
        <p>התחייבויות הסודיות לפי הסכם זה יעמדו בתוקפן למשך 5 שנים מיום החתימה, גם אם לא יתממש שיתוף פעולה בין הצדדים.</p>
        <h2>5. סעדים</h2>
        <p>הצדדים מסכימים כי הפרת הסכם זה עלולה לגרום לנזק בלתי הפיך אשר לא ניתן יהיה לפצותו בכסף בלבד, ועל כן הצד הנפגע יהיה זכאי לסעדים מן היושר, לרבות צווי מניעה.</p>
        <div className="signoff">
          <div className="signoff-block"><div className="lbl">צד א'</div><div className="line">חתימה וחותמת</div></div>
          <div className="signoff-block"><div className="lbl">צד ב'</div><div className="line">חתימה</div></div>
        </div>
      </div>
    )
  }
};

// FlowBiz price quote — defaults shared between the template renderer and the editor form
const QUOTE_DEFAULTS = {
  // Client / header
  clientName: "",
  businessName: "",
  quoteDate: "",

  // Pricing block
  packageName: "פלטפורמת FlowBiz",
  packageSub: "שלושה חודשים ראשונים · התחייבות מינימלית · ביטול בכל עת",
  monthlyPrice: "147",
  fullPrice: "297",
  savingsText: "חיסכון של 150₪ לחודש",
  monthsLabel: "לחודש · 3 חודשים ראשונים",
  pricingFootnote: "לאחר 3 חודשים, המחיר הרגיל הוא {fullPrice} ₪ לחודש. ניתן לבטל בכל שלב ללא קנסות. כל המחירים אינם כוללים מע״מ.",

  // Section visibility
  showCards: true,
  showFeatures: true,
  showAccounting: true,
  showRefund: true,
  showContact: true,
  showTerms: true,

  // What's in the package — 3 cards
  cards: [
    { icon: "check-circle", title: "גישה מלאה למערכת FlowBiz" },
    { icon: "whatsapp", title: "גישה לקבוצת הוואטסאפ" },
    { icon: "users", title: "פגישה 1:1 עם מנכ״ל FlowBiz" },
  ],

  // Features grid
  features: [
    "אפיון מלא",
    "התאמה אישית של המערכת",
    "תכנית עסקית מלאה",
    "ליווי ראיית חשבון אנושי",
    "מיתוג",
    "דף נחיתה בקליק",
    "שיווק ומכירות",
    "FlowBiz AI",
  ],

  // Accounting (page 2)
  accountingTitle: "ראיית חשבון · אופציונלי",
  accountingLead: "רכיב נוסף לחבילה, ניתן להוספה בכל שלב. אין התחייבות — ניתן להצטרף או לוותר בהתאם לצורך.",
  accountingBanner: "אופציונלי · תוספת ✓ כולל ליווי ע״י רו״ח אנושי · ✓ תוכנה לניהול חשבוניות — חינם",
  accountingRows: [
    { name: "פתיחת תיק", desc: "חד פעמי, כולל רישום ברשויות המס", descItalic: "", price: "249₪", when: "חד פעמי" },
    { name: "עוסק פטור — חבילה חודשית", desc: "מתאים למחזור עד התקרה השנתית של עוסק פטור", descItalic: "", price: "179₪ / חודש", when: "חיוב חודשי" },
    { name: "עוסק מורשה — חבילה חודשית", desc: "כולל דיווחי מע״מ דו-חודשיים וליווי שוטף", descItalic: "", price: "379₪ / חודש", when: "חיוב חודשי" },
    { name: "דו״ח שנתי", desc: "משלמים רק אם בוחרים בשירות — חיוב יחיד בסוף השנה.", descItalic: "חישוב: 840₪ פחות (מספר החודשים שנותרו עד סוף השנה × 70₪)", price: "עד 840₪", when: "סוף השנה" },
  ],
  accountingChecks: ["רו״ח אנושי זמין", "תוכנת חשבוניות חינם", "דיווחים לרשויות", "ייעוץ שוטף"],

  // Refund callout
  refundTitle: "14 יום להחזר מלא — ללא שאלות",
  refundBody: "אם תוך 14 יום מתחילת השימוש תחליטו שזה לא בשבילכם — פשוט כתבו לנו ונחזיר את מלוא הסכום.",

  // Contact strip
  phone: "052-790-6229",
  email: "a.o.t.startapps@gmail.com",
  validity: "14 יום ממועד ההצעה",

  // Terms paragraph
  termsText: "כל המחירים אינם כוללים מע״מ. המחיר המוזל ({monthlyPrice}₪) תקף לשלושה חודשים ראשונים בלבד; החל מהחודש הרביעי יחול מחיר המחירון הרגיל ({fullPrice}₪ לחודש). ניתן לבטל את המנוי בכל עת ללא התחייבות או קנסות. שירותי ראיית החשבון אופציונליים ואינם חלק מחבילת המערכת הבסיסית. אחריות החזר מלא תקפה ל-14 יום מתחילת השימוש הפעיל במערכת.",
};

function normalizeQuoteData(q) {
  const merged = { ...QUOTE_DEFAULTS, ...(q || {}) };
  // Ensure arrays are arrays (in case partial overrides came through)
  if (!Array.isArray(merged.cards)) merged.cards = QUOTE_DEFAULTS.cards;
  if (!Array.isArray(merged.features)) merged.features = QUOTE_DEFAULTS.features;
  if (!Array.isArray(merged.accountingRows)) merged.accountingRows = QUOTE_DEFAULTS.accountingRows;
  if (!Array.isArray(merged.accountingChecks)) merged.accountingChecks = QUOTE_DEFAULTS.accountingChecks;
  return merged;
}

function interpolate(tpl, vars) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ""));
}

window.QUOTE_DEFAULTS = QUOTE_DEFAULTS;
window.normalizeQuoteData = normalizeQuoteData;

// Hebrew number-to-words (positive integers up to 999,999, masculine for shekels)
function numberToHebrewWords(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "אפס";

  const ones = ["", "אחד", "שניים", "שלושה", "ארבעה", "חמישה", "שישה", "שבעה", "שמונה", "תשעה"];
  const onesConstruct = ["", "אחד", "שני", "שלושת", "ארבעת", "חמשת", "ששת", "שבעת", "שמונת", "תשעת"];
  const teens = ["עשרה", "אחד עשר", "שניים עשר", "שלושה עשר", "ארבעה עשר", "חמישה עשר", "שישה עשר", "שבעה עשר", "שמונה עשר", "תשעה עשר"];
  const tens = ["", "", "עשרים", "שלושים", "ארבעים", "חמישים", "שישים", "שבעים", "שמונים", "תשעים"];
  const hundreds = ["", "מאה", "מאתיים", "שלוש מאות", "ארבע מאות", "חמש מאות", "שש מאות", "שבע מאות", "שמונה מאות", "תשע מאות"];

  function under1000(num) {
    if (num === 0) return "";
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const o = num % 10;
      return tens[t] + (o > 0 ? " ו" + ones[o] : "");
    }
    const h = Math.floor(num / 100);
    const r = num % 100;
    return hundreds[h] + (r > 0 ? " ו" + under1000(r).replace(/^ו/, "") : "");
  }

  if (n < 1000) return under1000(n);

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  let head;
  if (thousands === 1) head = "אלף";
  else if (thousands === 2) head = "אלפיים";
  else if (thousands < 10) head = onesConstruct[thousands] + " אלפים";
  else head = under1000(thousands) + " אלף";

  return head + (rest > 0 ? " ו" + under1000(rest).replace(/^ו/, "") : "");
}
window.numberToHebrewWords = numberToHebrewWords;

// Bank-transfer resolution defaults — pre-filled with the company's account info from the source PDF
const BANK_TRANSFER_DEFAULTS = {
  resolutionNumber: "",
  date: "",
  type: "העברה חד-פעמית",

  amount: "",
  amountWords: "",
  currency: "₪",

  // Source = the company's bank account (constants for this company)
  sourceBank: "מזרחי טפחות",
  sourceBankCode: "20",
  sourceBranchNumber: "572",
  sourceBranchName: "אופק",
  sourceAccount: "412900",

  // Beneficiary — filled per transfer
  beneficiaryName: "",
  beneficiaryBank: "",
  beneficiaryBranch: "",
  beneficiaryAccount: "",
  paymentPurpose: "",

  // Authorized signatories — defaults from source PDF, editable
  signatories: [
    { name: "אורי אשר", id: "318338175" },
    { name: "עמית בן שמחון", id: "209352269" },
  ],

  // Section visibility
  showSummary: true,
  showDisclaimer: true,

  disclaimerText: "החלטה זו מהווה הרשאה חד-פעמית לביצוע ההעברה הבנקאית המפורטת בלבד, ואינה מהווה ייפוי כח כללי. ההחלטה תקפה רק בנוכחות חתימת כל המורשים הנדרשים כמפורט בתקנון החברה. יש לשמור עותק חתום בתיק החברה.",
};

function normalizeBankTransferData(b) {
  const merged = { ...BANK_TRANSFER_DEFAULTS, ...(b || {}) };
  if (!Array.isArray(merged.signatories) || merged.signatories.length === 0) {
    merged.signatories = BANK_TRANSFER_DEFAULTS.signatories;
  }
  return merged;
}

window.BANK_TRANSFER_DEFAULTS = BANK_TRANSFER_DEFAULTS;
window.normalizeBankTransferData = normalizeBankTransferData;

// FlowBiz price quote — fillable template based on the company's standard quote PDF
DOC_TEMPLATES.flowbiz_quote = {
  name: "הצעת מחיר FlowBiz",
  category: "הצעת מחיר",
  counterparty: "לקוח חדש",
  pages: 2,
  render: (page, doc) => {
    const q = normalizeQuoteData(doc && doc.quoteData);
    const clientName = q.clientName || "—";
    const businessName = q.businessName || q.clientName || "—";
    const quoteDate = q.quoteDate || formatDate();
    const vars = { monthlyPrice: q.monthlyPrice, fullPrice: q.fullPrice };
    const pricingFootnote = interpolate(q.pricingFootnote, vars);
    const termsText = interpolate(q.termsText, vars);

    if (page === 0) {
      return (
        <div className="page-content quote-page">
          <div className="quote-head">
            <div className="quote-head-info">
              <div className="quote-head-co">A.O.T STARTAPPS LTD</div>
              <div className="quote-head-sub">מפעילה את פלטפורמת FlowBiz</div>
              <div className="quote-head-sub">טל׳ {q.phone}</div>
            </div>
            <img src="assets/logo.png" alt="FlowBiz" className="quote-head-logo" />
          </div>
          <hr className="quote-hr" />
          <div className="quote-eyebrow">הצעת מחיר · QUOTE</div>
          <h1 className="quote-h1">מהרעיון ועד ללקוח הראשון<br/>— הכל במקום אחד.</h1>
          <p className="quote-lead">
            חבילת ליווי מלאה להקמת עסק: גישה למערכת FlowBiz, פגישה אישית עם מנכ״ל החברה, וקהילה פעילה של יזמים — הכל תחת קורת גג אחת.
          </p>

          <div className="quote-info-box">
            <div className="quote-info-cell">
              <div className="lbl">ללקוח / לקוחה</div>
              <div className="val">{clientName}</div>
            </div>
            <div className="quote-info-cell">
              <div className="lbl">שם העסק</div>
              <div className="val">{businessName}</div>
            </div>
            <div className="quote-info-cell">
              <div className="lbl">תאריך הצעה</div>
              <div className="val">{quoteDate}</div>
            </div>
          </div>

          {q.showCards && q.cards.length > 0 && (
            <>
              <h2 className="quote-h2">מה תקבלו בחבילה</h2>
              <div className="quote-cards">
                {q.cards.map((c, i) => (
                  <div key={i} className="quote-card">
                    <div className="quote-card-icon"><Icon name={c.icon || "check-circle"} size={18} /></div>
                    <div className="quote-card-title">{c.title}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {q.showFeatures && q.features.length > 0 && (
            <>
              <h2 className="quote-h2">חלק מהפיצ׳רים הכלולים במערכת</h2>
              <div className="quote-features">
                {q.features.map((f, i) => (
                  <div key={i} className="quote-feature"><Icon name="check" size={13} color="var(--green-600)" /> {f}</div>
                ))}
              </div>
            </>
          )}

          <div className="quote-price-box">
            <div className="quote-price-pill">מחיר מבצע היכרות</div>
            <div className="quote-price-row">
              <div className="quote-price-left">
                <div className="quote-price-name">{q.packageName}</div>
                <div className="quote-price-sub">{q.packageSub}</div>
                {q.savingsText && <div className="quote-savings">{q.savingsText}</div>}
              </div>
              <div className="quote-price-right">
                <div className="quote-price-old">{q.fullPrice} ₪ / חודש</div>
                <div className="quote-price-new">₪{q.monthlyPrice}</div>
                <div className="quote-price-cap">{q.monthsLabel}</div>
              </div>
            </div>
            {pricingFootnote && <div className="quote-price-foot">{pricingFootnote}</div>}
          </div>
        </div>
      );
    }

    // Page 2 — built dynamically from enabled sections
    const sections = [];

    if (q.showAccounting) {
      sections.push(
        <div key="acct">
          <h2 className="quote-h2" style={{ marginTop: 6 }}>{q.accountingTitle}</h2>
          {q.accountingLead && <p className="quote-lead-sm">{q.accountingLead}</p>}
          <div className="quote-acct">
            {q.accountingBanner && <div className="quote-acct-banner">{q.accountingBanner}</div>}
            <div className="quote-acct-row quote-acct-cols">
              <div>רכיב</div>
              <div>מחיר</div>
              <div>מועד חיוב</div>
            </div>
            {q.accountingRows.map((r, i) => (
              <div key={i} className="quote-acct-row">
                <div>
                  <strong>{r.name}</strong>
                  {r.desc && <div className="sub">{r.desc}</div>}
                  {r.descItalic && <div className="sub italic">{r.descItalic}</div>}
                </div>
                <div><strong>{r.price}</strong></div>
                <div>{r.when}</div>
              </div>
            ))}
          </div>
          {q.accountingChecks.length > 0 && (
            <div className="quote-checkmarks">
              {q.accountingChecks.map((c, i) => (
                <span key={i}><Icon name="check" size={12} color="var(--green-600)" /> {c}</span>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (q.showRefund) {
      sections.push(
        <div key="refund" className="quote-refund">
          <div className="quote-refund-icon"><Icon name="shield-check" size={18} color="#fff" /></div>
          <div>
            <div className="quote-refund-title">{q.refundTitle}</div>
            <div className="quote-refund-body">{q.refundBody}</div>
          </div>
        </div>
      );
    }

    sections.push(
      <div key="signoff" className="quote-signoff">
        <div className="quote-signoff-block">
          <div className="quote-signoff-label">חתימת הלקוח</div>
          <div className="quote-signoff-line" />
          <div className="quote-signoff-cap">שם מלא · תאריך</div>
        </div>
        <div className="quote-signoff-block">
          <div className="quote-signoff-label">חתימת הספק</div>
          <div className="quote-signoff-line" />
          <div className="quote-signoff-cap">תאריך · A.O.T STARTAPPS LTD</div>
        </div>
      </div>
    );

    if (q.showContact) {
      sections.push(
        <div key="contact" className="quote-contact">
          <div><div className="lbl">טלפון / וואטסאפ</div><strong>{q.phone}</strong></div>
          <div><div className="lbl">אימייל</div><strong>{q.email}</strong></div>
          <div><div className="lbl">תוקף ההצעה</div><strong>{q.validity}</strong></div>
        </div>
      );
    }

    if (q.showTerms && termsText) {
      sections.push(
        <div key="terms" className="quote-terms">
          <strong>תנאי ההצעה:</strong> {termsText}
        </div>
      );
    }

    return (
      <div className="page-content quote-page">
        <div className="quote-head">
          <div>
            <div className="quote-head-co">המשך הצעת מחיר</div>
            <div className="quote-head-sub">ל{clientName}</div>
          </div>
          <img src="assets/logo.png" alt="FlowBiz" className="quote-head-logo" />
        </div>
        <hr className="quote-hr" />
        {sections}
      </div>
    );
  },
};

// Bank transfer resolution — single page, signed by 2 authorized signatories
DOC_TEMPLATES.bank_transfer = {
  name: "החלטה לאישור העברה בנקאית",
  category: "החלטה",
  counterparty: "מוטב",
  pages: 1,
  render: (page, doc) => {
    const b = normalizeBankTransferData(doc && doc.bankTransferData);
    const amountStr = b.amount ? `${b.amount} ${b.currency}` : "—";
    const sourceFull = `${b.sourceBank}${b.sourceBankCode ? ` (${b.sourceBankCode})` : ""} · סניף ${b.sourceBranchNumber}${b.sourceBranchName ? ` · ${b.sourceBranchName}` : ""} · ח-ן ${b.sourceAccount}`;
    const benefAccountFull = `${b.beneficiaryBank ? "בנק " + b.beneficiaryBank : ""}${b.beneficiaryBranch ? " · סניף " + b.beneficiaryBranch : ""} · ח-ן ${b.beneficiaryAccount}`;

    return (
      <div className="page-content bt-page">
        <div className="quote-head">
          <div className="quote-head-info">
            <div className="quote-head-co">A.O.T STARTAPPS LTD</div>
            <div className="quote-head-sub">מפעילה את פלטפורמת FlowBiz</div>
            <div className="quote-head-sub">טל׳ 052-790-6229</div>
          </div>
          <img src="assets/logo.png" alt="FlowBiz" className="quote-head-logo" />
        </div>
        <hr className="quote-hr" />
        <div className="quote-eyebrow">החלטת מורשי חתימה · RESOLUTION</div>
        <h1 className="quote-h1" style={{ marginBottom: 4 }}>החלטה לאישור העברה בנקאית</h1>
        <div className="bt-subhead">של חברת <strong>A.O.T STARTAPPS LTD</strong></div>

        <div className="quote-info-box">
          <div className="quote-info-cell">
            <div className="lbl">מספר החלטה</div>
            <div className="val" dir="ltr" style={{ textAlign: "right" }}>{b.resolutionNumber || "—"}</div>
          </div>
          <div className="quote-info-cell">
            <div className="lbl">תאריך</div>
            <div className="val">{b.date || "—"}</div>
          </div>
          <div className="quote-info-cell">
            <div className="lbl">סוג</div>
            <div className="val">{b.type || "—"}</div>
          </div>
        </div>

        <h3 className="bt-section-title">הוחלט כדלקמן:</h3>

        <p className="bt-decision">
          הוחלט לאשר העברה בנקאית{" "}
          <span className="bt-fill">{b.type || "—"}</span>{" "}
          על סך{" "}
          <span className="bt-fill bt-fill-num">{b.amount || "—"}</span>{" "}
          {b.currency}{" "}
          <span className="bt-fill">{b.amountWords || "—"}</span>
          , מחשבון החברה שמספרו{" "}
          <span className="bt-fill bt-fill-num">{b.sourceAccount || "—"}</span>{" "}
          בבנק{" "}
          <span className="bt-fill">{[b.sourceBank, b.sourceBankCode].filter(Boolean).join(" ") || "—"}</span>
          , סניף{" "}
          <span className="bt-fill">{[b.sourceBranchNumber, b.sourceBranchName].filter(Boolean).join(" · ") || "—"}</span>
          , לטובת{" "}
          <span className="bt-fill">{b.beneficiaryName || "—"}</span>
          , בבנק{" "}
          <span className="bt-fill">{b.beneficiaryBank || "—"}</span>
          , סניף{" "}
          <span className="bt-fill bt-fill-num">{b.beneficiaryBranch || "—"}</span>
          , חשבון{" "}
          <span className="bt-fill bt-fill-num">{b.beneficiaryAccount || "—"}</span>
          , עבור{" "}
          <span className="bt-fill">{b.paymentPurpose || "—"}</span>
          .
        </p>

        {b.showSummary && (
          <div className="bt-summary">
            <div className="bt-summary-row">
              <div className="bt-summary-lbl">סכום להעברה</div>
              <div className="bt-summary-val">{amountStr}</div>
            </div>
            <div className="bt-summary-row">
              <div className="bt-summary-lbl">חשבון מקור</div>
              <div className="bt-summary-val">{sourceFull}</div>
            </div>
            <div className="bt-summary-row">
              <div className="bt-summary-lbl">מוטב</div>
              <div className="bt-summary-val">{b.beneficiaryName || "—"}</div>
            </div>
            <div className="bt-summary-row">
              <div className="bt-summary-lbl">חשבון המוטב</div>
              <div className="bt-summary-val">{benefAccountFull}</div>
            </div>
            <div className="bt-summary-row">
              <div className="bt-summary-lbl">מטרת התשלום</div>
              <div className="bt-summary-val">{b.paymentPurpose || "—"}</div>
            </div>
          </div>
        )}

        <h3 className="bt-section-title">המורשים לביצוע פעולה זו</h3>
        <p className="bt-section-lead">החתומים מטה, המורשים מטעם החברה, מאשרים את ההחלטה המפורטת לעיל:</p>

        <div className="bt-signatories">
          {b.signatories.map((s, i) => (
            <div key={i} className="bt-signatory">
              <div className="bt-signatory-info">
                <div className="bt-signatory-name">{s.name || "—"}</div>
                <div className="bt-signatory-id">ת.ז {s.id || "—"}</div>
                <div className="bt-signatory-role">מורשה חתימה</div>
              </div>
              <div className="bt-signatory-sig">
                <div className="bt-signatory-label">חתימה</div>
                <div className="bt-signatory-line"></div>
                <div className="bt-signatory-cap">חתימה וחותמת · {b.date || "—"}</div>
              </div>
            </div>
          ))}
        </div>

        {b.showDisclaimer && b.disclaimerText && (
          <div className="bt-disclaimer">
            <strong>כללי:</strong> {b.disclaimerText}
          </div>
        )}
      </div>
    );
  },
};

window.DOC_TEMPLATES = DOC_TEMPLATES;

// Main app — library + editor + share modal + counterparty view

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

// LocalStorage helpers — fake backend
const STORAGE_KEY = "flowbiz-sign-docs-v1";
const SIG_KEY = "flowbiz-sign-mysig-v1";
const SHARED_KEY = "flowbiz-sign-shared-v1"; // map shareToken -> docId
const VENDORS_KEY = "flowbiz-vendors-v1";

function loadDocs() {
  try {return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;} catch {return null;}
}
function saveDocs(docs) {
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));} catch {}
}
function loadSig() {try {return localStorage.getItem(SIG_KEY);} catch {return null;}}
function saveSig(s) {try {localStorage.setItem(SIG_KEY, s);} catch {}}

function loadVendors() {
  try { return JSON.parse(localStorage.getItem(VENDORS_KEY)) || []; } catch { return []; }
}
function saveVendors(vendors) {
  try { localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors)); } catch {}
}

// Saved signatures library — assign one signature image per named person.
// Used to auto-fill multi-signatory documents (e.g. bank transfer) without
// re-drawing every time.
const SAVED_SIGS_KEY = "flowbiz-saved-signatures-v1";
function loadSavedSignatures() {
  try { return JSON.parse(localStorage.getItem(SAVED_SIGS_KEY)) || []; } catch { return []; }
}
function saveSavedSignatures(sigs) {
  try { localStorage.setItem(SAVED_SIGS_KEY, JSON.stringify(sigs)); } catch {}
}
function findSavedSignatureByName(name) {
  const norm = String(name || "").trim().toLowerCase();
  if (!norm) return null;
  const sigs = loadSavedSignatures();
  return sigs.find((s) => String(s.name || "").trim().toLowerCase() === norm) || null;
}

// Expose to other scripts (editor, client view) so they can decide whether to
// open the picker vs. auto-fill mySignature.
window.loadSavedSignatures = loadSavedSignatures;
window.saveSavedSignatures = saveSavedSignatures;
window.findSavedSignatureByName = findSavedSignatureByName;

// ── Admin auth + cross-device sync ─────────────────────────────────────────
// Two pre-shared admin credentials. Both see and edit the same docs library,
// vendors list, and saved signatures via the /api/admin/state endpoint.
const ADMIN_AUTH_KEY = "flowbiz-admin-auth-v1";
const ADMIN_USERS = [
  { email: "orias3@gmail.com", pwd: "FlowBiz517268330" },
  { email: "amitbens97@gmail.com", pwd: "FlowBiz517268330" },
];

function loadAdminAuth() {
  try {
    const data = JSON.parse(localStorage.getItem(ADMIN_AUTH_KEY));
    if (data && data.email && data.basicAuth) return data;
  } catch {}
  return null;
}
function saveAdminAuth(auth) {
  try { localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(auth)); } catch {}
}
function clearAdminAuth() {
  try { localStorage.removeItem(ADMIN_AUTH_KEY); } catch {}
}

async function apiAdminStateGet(auth) {
  const r = await fetch("/api/admin/state", {
    headers: { "Authorization": auth.basicAuth },
    cache: "no-store",
  });
  if (r.status === 401) return { unauthorized: true };
  if (!r.ok) throw new Error("get_failed:" + r.status);
  return r.json();
}

async function apiAdminStatePut(state, auth) {
  const r = await fetch("/api/admin/state", {
    method: "PUT",
    headers: { "Authorization": auth.basicAuth, "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (r.status === 401) return { unauthorized: true };
  if (r.status === 409) {
    const data = await r.json().catch(() => ({}));
    return { conflict: true, currentState: data.currentState || null };
  }
  if (!r.ok) throw new Error("put_failed:" + r.status);
  return r.json();
}

// Auto-incrementing resolution number per year, based on existing bank-transfer docs
function nextResolutionNumber(existingDocs) {
  const year = new Date().getFullYear();
  let max = 1190;
  (existingDocs || []).forEach((d) => {
    if (d.template === "bank_transfer" && d.bankTransferData && d.bankTransferData.resolutionNumber) {
      const m = String(d.bankTransferData.resolutionNumber).match(/AOT-(\d{4})-(\d+)/i);
      if (m && m[1] === String(year)) {
        const n = parseInt(m[2], 10);
        if (!isNaN(n) && n > max) max = n;
      }
    }
  });
  return `AOT-${year}-${max + 1}`;
}

function todayDateString() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function nowTimeString() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DEFAULT_DOCS = [
{
  id: "demo-1", name: "הסכם שירותי ייעוץ דיגיטלי", template: "service_agreement",
  counterparty: "סטודיו לעיצוב מאיה ברק",
  status: "draft", createdAt: Date.now() - 86400000 * 2,
  fields: []
},
{
  id: "demo-2", name: "הצעת מחיר #2026-041", template: "price_quote",
  counterparty: "דניאל לוי - לקוח",
  status: "sent", createdAt: Date.now() - 86400000 * 5,
  fields: [
  { id: "pq-s1", type: "signature", page: 0, x: 90, y: 980, w: 180, h: 60, assignee: "me", value: null },
  { id: "pq-st1", type: "stamp", page: 0, x: 280, y: 950, w: 110, h: 110, assignee: "me", value: "stamp" },
  { id: "pq-s2", type: "signature", page: 0, x: 500, y: 980, w: 180, h: 60, assignee: "them", value: null },
  { id: "pq-d2", type: "date", page: 0, x: 510, y: 1050, w: 140, h: 30, assignee: "them", value: null }],

  shareToken: "abc123xy"
},
{
  id: "demo-3", name: "הסכם סודיות הדדי - Cloudwave", template: "nda",
  counterparty: "Cloudwave Solutions",
  status: "completed", createdAt: Date.now() - 86400000 * 12,
  fields: []
}];


function statusOf(doc) {
  if (doc.status === "completed") return "completed";
  const them = doc.fields.filter((f) => f.assignee === "them");
  if (doc.shareId || doc.shareToken) {
    if (them.length && them.every((f) => f.value)) return "completed";
    return "sent";
  }
  return "draft";
}

// API client for the share backend
async function apiCreateShare(doc) {
  const r = await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!r.ok) throw new Error("create_failed");
  return r.json();
}
async function apiGetShare(id) {
  const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!r.ok) throw new Error("get_failed");
  return r.json();
}
async function apiUpdateShare(id, doc) {
  const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!r.ok) throw new Error("update_failed");
  return r.json();
}

function sanitizeForCounterparty(doc) {
  // Drop "them" field values so the client always starts with empty markers.
  return {
    ...doc,
    fields: (doc.fields || []).map((f) => f.assignee === "them" ? { ...f, value: null } : f),
    sender: doc.sender || "איי או טי סטארטפס בע״מ",
    status: doc.status === "completed" ? "draft" : doc.status,
  };
}

const Library = ({ docs, onOpen, onUpload, onNew, onNewQuote, onNewBankTransfer, onNewSalesCall, onOpenSavedSigs, onDelete, onDuplicate, adminEmail, onLogout }) => {
  const [drag, setDrag] = useStateA(false);
  const fileRef = React.useRef(null);
  const counts = useMemoA(() => {
    return {
      total: docs.length,
      draft: docs.filter((d) => statusOf(d) === "draft").length,
      sent: docs.filter((d) => statusOf(d) === "sent").length,
      done: docs.filter((d) => statusOf(d) === "completed").length
    };
  }, [docs]);

  const handleFiles = (files) => {
    if (!files || !files.length) return;
    onUpload(files[0]);
  };

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <img src="assets/logo.png" alt="FlowBiz" />
          <div>
            <div className="brand-title">
              דף חתימות
              <span className="pill pill-ai" style={{ padding: "2px 8px", fontSize: 11 }}>FlowBiz Sign</span>
            </div>
            <div className="brand-sub">שולחים, חותמים, מחזירים — בלי מדפסת, בלי סורק.</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenSavedSigs && onOpenSavedSigs()}>
            <Icon name="pen-tool" size={14} /> החתימות שלי
          </button>
          {adminEmail ? (
            <div className="admin-badge">
              <Icon name="shield-check" size={13} color="var(--green-600)" />
              <span className="admin-badge-email" dir="ltr">{adminEmail}</span>
              <button className="admin-logout-btn" onClick={onLogout} title="התנתקות"><Icon name="x" size={12} /></button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm">
              <Icon name="user" size={14} /> איי או טי סטארטפס בע״מ
            </button>
          )}
        </div>
      </div>

      <div className="library">
        <div className="library-head">
          <div>
            <h1>המסמכים שלי</h1>
            <p className="sub">העלה מסמך, סמן איפה לחתום ולהחתים, וקבל קישור לשליחה.</p>
          </div>
          <div className="library-cta">
            <button className="btn btn-secondary btn-lg" onClick={() => onNewSalesCall && onNewSalesCall()}>
              <Icon name="users" size={16} /> סיכום שיחת מכירה
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => onNewBankTransfer && onNewBankTransfer()}>
              <Icon name="shield-check" size={16} /> העברה לבנק
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => onNewQuote && onNewQuote()}>
              <Icon name="file-plus" size={16} /> הצעת מחיר חדשה
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => fileRef.current && fileRef.current.click()}>
              <Icon name="plus" size={16} /> מסמך חדש
            </button>
          </div>
          <input type="file" hidden ref={fileRef} accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        <div className="stat-row">
          <div className="stat">
            <div className="stat-icon" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}>
              <Icon name="file-text" size={20} />
            </div>
            <div><div className="stat-num">{counts.total}</div><div className="stat-lbl">סך הכל מסמכים</div></div>
          </div>
          <div className="stat">
            <div className="stat-icon" style={{ background: "var(--gray-100)", color: "var(--gray-600)" }}>
              <Icon name="edit" size={20} />
            </div>
            <div><div className="stat-num">{counts.draft}</div><div className="stat-lbl">בטיוטה</div></div>
          </div>
          <div className="stat">
            <div className="stat-icon" style={{ background: "var(--orange-50)", color: "var(--orange-600)" }}>
              <Icon name="clock" size={20} />
            </div>
            <div><div className="stat-num">{counts.sent}</div><div className="stat-lbl">ממתין לחתימה</div></div>
          </div>
          <div className="stat">
            <div className="stat-icon" style={{ background: "var(--green-50)", color: "var(--green-700)" }}>
              <Icon name="check-circle" size={20} />
            </div>
            <div><div className="stat-num">{counts.done}</div><div className="stat-lbl">חתום ע"י שני הצדדים</div></div>
          </div>
        </div>

        <div className="doc-grid">
          <div
            className={"upload-tile " + (drag ? "dragging" : "")}
            onDragOver={(e) => {e.preventDefault();setDrag(true);}}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}
            onClick={() => fileRef.current && fileRef.current.click()}>
            
            <div className="upload-tile-circle"><Icon name="upload-cloud" size={26} /></div>
            <div className="upload-tile-title">גרור/י קובץ או לחץ/י להעלאה</div>
            <div className="upload-tile-sub">PDF, PNG, JPG · עד 20MB</div>
            <button className="btn btn-soft btn-sm" style={{ marginTop: 8 }}>
              <Icon name="file-plus" size={14} /> בחירת קובץ
            </button>
          </div>
          {docs.map((doc) => {
            const s = statusOf(doc);
            const template = DOC_TEMPLATES[doc.template];
            return (
              <div key={doc.id} className="doc-card" onClick={() => onOpen(doc.id)}>
                <div className="doc-card-actions">
                  <button className="doc-card-act" title="שכפול" onClick={(e) => { e.stopPropagation(); onDuplicate(doc.id); }}>
                    <Icon name="copy" size={14} />
                  </button>
                  <button className="doc-card-act doc-card-del" title="מחיקה" onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="doc-thumb">
                  {doc.uploadedPages && doc.uploadedPages[0]
                    ? <img src={doc.uploadedPages[0]} className="doc-thumb-bg" alt="" />
                    : <div className="doc-thumb-page" />}
                  {(s === "completed" || s === "sent") &&
                  <>
                      <img src="assets/stamp.png" className="doc-thumb-stamp" alt="" />
                      <div className="doc-thumb-sig">דני</div>
                    </>
                  }
                </div>
                <div className="doc-meta">
                  <p className="doc-title">{doc.name}</p>
                  <p className="doc-sub">
                    <Icon name="users" size={12} /> {template?.counterparty || doc.counterparty}
                  </p>
                </div>
                <div className="doc-foot">
                  {s === "draft" && <span className="pill pill-neutral">טיוטה</span>}
                  {s === "sent" && <span className="pill pill-warn"><Icon name="clock" size={11} /> ממתין</span>}
                  {s === "completed" && <span className="pill pill-ok"><Icon name="check" size={11} /> הושלם</span>}
                  <span style={{ fontSize: 11.5, color: "var(--gray-500)" }}>
                    {new Date(doc.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
              </div>);

          })}
        </div>
      </div>
    </>);

};

function buildShortUrl(shareId) {
  return `${location.origin}/s/${shareId}`;
}

// Modal for creating or editing a FlowBiz price quote
// Stable top-level section component for the QuoteFormModal accordion.
// IMPORTANT: must NOT be defined inside QuoteFormModal — React would treat it
// as a new component type on every keystroke, unmount/remount the body and
// reset both the scroll position and input focus.
const QuoteFormSection = ({ title, toggleable, included, count, isOpen, onToggleOpen, onToggleIncluded, children }) => (
  <div className={"qsec " + (isOpen ? "open " : "") + (toggleable && !included ? "off" : "")}>
    <div className="qsec-head" onClick={onToggleOpen}>
      <div className="qsec-title">
        <Icon name="chevron-left" size={14} />
        <span>{title}</span>
        {count != null && <span className="qsec-count">{count}</span>}
        {toggleable && !included && <span className="qsec-off-pill">מוסתר</span>}
      </div>
      {toggleable && (
        <label className="qsec-toggle" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={included} onChange={(e) => onToggleIncluded(e.target.checked)} />
          <span>{included ? "כלול במסמך" : "מוסתר"}</span>
        </label>
      )}
    </div>
    {isOpen && <div className="qsec-body">{children}</div>}
  </div>
);

const CARD_ICONS = [
  { value: "check-circle", label: "✓ סימן" },
  { value: "whatsapp", label: "וואטסאפ" },
  { value: "users", label: "אנשים" },
  { value: "mail", label: "מייל" },
  { value: "calendar", label: "תאריך" },
  { value: "pen-tool", label: "עט" },
  { value: "shield-check", label: "מגן" },
  { value: "sparkles", label: "ניצוץ" },
  { value: "file-text", label: "מסמך" },
];

const QuoteFormModal = ({ open, onClose, onSubmit, initial }) => {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  const seedData = () => {
    const base = window.normalizeQuoteData ? window.normalizeQuoteData(initial) : { ...(initial || {}) };
    if (!base.quoteDate) base.quoteDate = todayStr;
    return base;
  };

  const [data, setData] = useStateA(seedData);
  const [openSection, setOpenSection] = useStateA("client");

  useEffectA(() => {
    if (open) {
      setData(seedData());
      setOpenSection("client");
    }
  }, [open]);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const updateRow = (key, i, patch) => setData((d) => ({ ...d, [key]: d[key].map((r, idx) => idx === i ? { ...r, ...patch } : r) }));
  const updateAt = (key, i, value) => setData((d) => ({ ...d, [key]: d[key].map((v, idx) => idx === i ? value : v) }));
  const removeAt = (key, i) => setData((d) => ({ ...d, [key]: d[key].filter((_, idx) => idx !== i) }));
  const appendTo = (key, value) => setData((d) => ({ ...d, [key]: [...d[key], value] }));

  // Block-specific helpers
  const moveBlock = (i, dir) => setData((d) => {
    const arr = [...(d.blocks || [])];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...d, blocks: arr };
  });
  const addBlock = (type) => setData((d) => {
    const id = "blk-" + Math.random().toString(36).slice(2, 9);
    let block = { id, type };
    if (type === "heading") block.text = "";
    else if (type === "subheading") block.text = "";
    else if (type === "paragraph") block.text = "";
    else if (type === "labeled") block = { id, type, label: "", text: "" };
    else if (type === "callout") block = { id, type, title: "", text: "" };
    else if (type === "milestone") block = { id, type, title: "", focusLabel: "המיקוד", focus: "", valueLabel: "הערך המרכזי", value: "", tasksLabel: "משימות", tasks: [""] };
    return { ...d, blocks: [...(d.blocks || []), block] };
  });
  const updateMsTask = (bi, ti, value) => setData((d) => ({
    ...d,
    blocks: d.blocks.map((b, idx) => idx === bi ? { ...b, tasks: b.tasks.map((t, k) => k === ti ? value : t) } : b),
  }));
  const addMsTask = (bi) => setData((d) => ({
    ...d,
    blocks: d.blocks.map((b, idx) => idx === bi ? { ...b, tasks: [...(b.tasks || []), ""] } : b),
  }));
  const removeMsTask = (bi, ti) => setData((d) => ({
    ...d,
    blocks: d.blocks.map((b, idx) => idx === bi ? { ...b, tasks: b.tasks.filter((_, k) => k !== ti) } : b),
  }));

  const BLOCK_TYPE_LABELS = {
    heading: "כותרת",
    subheading: "כותרת משנה",
    paragraph: "פסקה",
    labeled: "שורה עם הדגשה",
    milestone: "אבן דרך",
    callout: "תיבה מודגשת",
  };

  const canSave = data.clientName && data.clientName.trim().length > 0;

  // Helper to render a section without creating a new component type each render.
  // Uses the lifted QuoteFormSection so React doesn't unmount/remount on edits.
  const sec = (id, title, opts, children) => (
    <QuoteFormSection
      key={id}
      title={title}
      toggleable={!!opts.toggleable}
      included={opts.includedKey ? !!data[opts.includedKey] : true}
      count={opts.count}
      isOpen={openSection === id}
      onToggleOpen={() => setOpenSection(openSection === id ? null : id)}
      onToggleIncluded={opts.includedKey ? (v) => update({ [opts.includedKey]: v }) : undefined}
    >
      {children}
    </QuoteFormSection>
  );

  return (
    <Modal open={open} onClose={onClose} wide noScrimClose
      title={initial ? "עריכת הצעה" : "הצעת מחיר חדשה"}
      subtitle="כל שינוי ייקלט מיידית במסמך אחרי שמירה. אפשר להפעיל/לכבות סקשנים שלמים ולערוך כל פריט.">
      <div className="qform">

        {sec("client", "פרטי לקוח", {}, (
          <>
            <label className="qfield">
              <span>שם הלקוח / לקוחה <span className="req">*</span></span>
              <input value={data.clientName} onChange={(e) => update({ clientName: e.target.value })} placeholder="לדוגמה: אלישבע" autoFocus />
            </label>
            <label className="qfield">
              <span>שם העסק</span>
              <input value={data.businessName} onChange={(e) => update({ businessName: e.target.value })} placeholder="(אם זהה לשם הלקוח אפשר להשאיר ריק)" />
            </label>
            <label className="qfield">
              <span>תאריך הצעה</span>
              <input value={data.quoteDate} onChange={(e) => update({ quoteDate: e.target.value })} placeholder="DD.MM.YYYY" dir="ltr" />
            </label>
          </>
        ))}

        {sec("hero", "כותרת ופתיח (טקסטים)", {}, (
          <>
            <div className="qgrid">
              <label className="qfield">
                <span>שם החברה (כותרת עליונה)</span>
                <input value={data.headerCo} onChange={(e) => update({ headerCo: e.target.value })} />
              </label>
              <label className="qfield">
                <span>שורת משנה בכותרת</span>
                <input value={data.headerSub} onChange={(e) => update({ headerSub: e.target.value })} />
              </label>
            </div>
            <label className="qfield">
              <span>תווית קטנה (eyebrow)</span>
              <input value={data.eyebrow} onChange={(e) => update({ eyebrow: e.target.value })} />
            </label>
            <label className="qfield">
              <span>כותרת ראשית</span>
              <textarea rows={2} value={data.heroTitle} onChange={(e) => update({ heroTitle: e.target.value })} />
            </label>
            <label className="qfield">
              <span>פסקת פתיח</span>
              <textarea rows={3} value={data.heroLead} onChange={(e) => update({ heroLead: e.target.value })} />
            </label>
            <div className="qgrid">
              <label className="qfield">
                <span>כותרת מקטע הכרטיסים</span>
                <input value={data.cardsTitle} onChange={(e) => update({ cardsTitle: e.target.value })} />
              </label>
              <label className="qfield">
                <span>כותרת מקטע הפיצ׳רים</span>
                <input value={data.featuresTitle} onChange={(e) => update({ featuresTitle: e.target.value })} />
              </label>
            </div>
          </>
        ))}

        {sec("pricing", "מחיר וחבילה", {}, (
          <>
            <label className="qfield">
              <span>תווית מעל קופסת המחיר</span>
              <input value={data.pricePill} onChange={(e) => update({ pricePill: e.target.value })} />
            </label>
            <label className="qfield">
              <span>שם החבילה</span>
              <input value={data.packageName} onChange={(e) => update({ packageName: e.target.value })} />
            </label>
            <label className="qfield">
              <span>תיאור משנה</span>
              <input value={data.packageSub} onChange={(e) => update({ packageSub: e.target.value })} />
            </label>
            <div className="qgrid">
              <label className="qfield">
                <span>מחיר מבצע</span>
                <input value={data.monthlyPrice} onChange={(e) => update({ monthlyPrice: e.target.value })} dir="ltr" />
              </label>
              <label className="qfield">
                <span>מחיר מחירון</span>
                <input value={data.fullPrice} onChange={(e) => update({ fullPrice: e.target.value })} dir="ltr" />
              </label>
            </div>
            <div className="qgrid">
              <label className="qfield">
                <span>תווית מחיר (תחת המספר)</span>
                <input value={data.monthsLabel} onChange={(e) => update({ monthsLabel: e.target.value })} placeholder="לדוגמה: לחודש / חד פעמי" />
              </label>
              <label className="qfield">
                <span>סיומת מחיר מחירון</span>
                <input value={data.fullPriceSuffix} onChange={(e) => update({ fullPriceSuffix: e.target.value })} placeholder="₪ / חודש" />
              </label>
            </div>
            <label className="qfield">
              <span>סיומת שורת החיסכון</span>
              <input value={data.savingsSuffix} onChange={(e) => update({ savingsSuffix: e.target.value })} placeholder="לחודש (השאר ריק ללא סיומת)" />
              <small>שורת ה"חיסכון" מחושבת אוטומטית מהפרש המחירים; כאן קובעים את מילת הזמן בסוף.</small>
            </label>
            <label className="qfield">
              <span>הערת תחתית בקופסת המחיר</span>
              <textarea rows={2} value={data.pricingFootnote} onChange={(e) => update({ pricingFootnote: e.target.value })} />
              <small>אפשר להשתמש ב-<code>{"{monthlyPrice}"}</code> ו-<code>{"{fullPrice}"}</code> כפלייסהולדרים.</small>
            </label>
          </>
        ))}

        {sec("cards", '"מה תקבלו בחבילה" (כרטיסים)', { toggleable: true, includedKey: "showCards", count: data.cards.length }, (
          <>
            {data.cards.map((c, i) => (
              <div key={i} className="qrowblock">
                <div className="qrowblock-head">
                  <select value={c.icon} onChange={(e) => updateRow("cards", i, { icon: e.target.value })}>
                    {CARD_ICONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <input value={c.title} onChange={(e) => updateRow("cards", i, { title: e.target.value })} placeholder="כותרת כרטיס" />
                  <button className="qicon-btn danger" onClick={() => removeAt("cards", i)} title="מחיקה"><Icon name="trash" size={13}/></button>
                </div>
              </div>
            ))}
            <button className="qadd-btn" onClick={() => appendTo("cards", { icon: "check-circle", title: "" })}>
              <Icon name="plus" size={13}/> הוסף כרטיס
            </button>
          </>
        ))}

        {sec("features", "פיצ׳רים בתוך החבילה", { toggleable: true, includedKey: "showFeatures", count: data.features.length }, (
          <>
            {data.features.map((f, i) => (
              <div key={i} className="qrow-edit">
                <input value={f} onChange={(e) => updateAt("features", i, e.target.value)} placeholder="טקסט פיצ׳ר" />
                <button className="qicon-btn danger" onClick={() => removeAt("features", i)} title="מחיקה"><Icon name="trash" size={13}/></button>
              </div>
            ))}
            <button className="qadd-btn" onClick={() => appendTo("features", "")}>
              <Icon name="plus" size={13}/> הוסף פיצ׳ר
            </button>
          </>
        ))}

        {sec("blocks", "בלוקים חופשיים (תוכן עשיר)", { toggleable: true, includedKey: "showBlocks", count: (data.blocks || []).length }, (
          <>
            <p className="qfield-hint">
              <Icon name="info" size={12} /> כל בלוק וכל טקסט ניתנים לעריכה. השתמש/י בחיצים כדי לשנות סדר. ברירת המחדל מכילה את תוכנית ההאצה למייסדים — ערוך/מחק לפי הצורך.
            </p>
            <label className="qfield">
              <span>כותרת המקטע (אופציונלי)</span>
              <input value={data.blocksTitle} onChange={(e) => update({ blocksTitle: e.target.value })} placeholder="(ריק = ללא כותרת מקטע)" />
            </label>

            {(data.blocks || []).map((b, i) => (
              <div key={b.id} className="qblk-edit">
                <div className="qblk-edit-head">
                  <span className="qblk-edit-type">{BLOCK_TYPE_LABELS[b.type] || b.type}</span>
                  <span className="qblk-spacer" />
                  <button className="qblk-move-btn" disabled={i === 0} onClick={() => moveBlock(i, -1)} title="הזז למעלה">↑</button>
                  <button className="qblk-move-btn" disabled={i === (data.blocks.length - 1)} onClick={() => moveBlock(i, 1)} title="הזז למטה">↓</button>
                  <button className="qicon-btn danger" onClick={() => removeAt("blocks", i)} title="מחיקה"><Icon name="trash" size={13}/></button>
                </div>

                {(b.type === "heading" || b.type === "subheading" || b.type === "paragraph") && (
                  <textarea rows={b.type === "paragraph" ? 3 : 1} value={b.text || ""} onChange={(e) => updateRow("blocks", i, { text: e.target.value })} placeholder="טקסט" className="sc-textarea" />
                )}

                {b.type === "labeled" && (
                  <>
                    <input value={b.label || ""} onChange={(e) => updateRow("blocks", i, { label: e.target.value })} placeholder="הדגשה (לדוגמה: POC מיידי)" />
                    <textarea rows={2} value={b.text || ""} onChange={(e) => updateRow("blocks", i, { text: e.target.value })} placeholder="טקסט" className="sc-textarea" />
                  </>
                )}

                {b.type === "callout" && (
                  <>
                    <input value={b.title || ""} onChange={(e) => updateRow("blocks", i, { title: e.target.value })} placeholder="כותרת" />
                    <textarea rows={2} value={b.text || ""} onChange={(e) => updateRow("blocks", i, { text: e.target.value })} placeholder="טקסט" className="sc-textarea" />
                  </>
                )}

                {b.type === "milestone" && (
                  <>
                    <input value={b.title || ""} onChange={(e) => updateRow("blocks", i, { title: e.target.value })} placeholder="כותרת אבן הדרך" />
                    <div className="qgrid">
                      <input value={b.focusLabel || ""} onChange={(e) => updateRow("blocks", i, { focusLabel: e.target.value })} placeholder="תווית 1 (המיקוד)" />
                      <input value={b.valueLabel || ""} onChange={(e) => updateRow("blocks", i, { valueLabel: e.target.value })} placeholder="תווית 2 (הערך המרכזי)" />
                    </div>
                    <textarea rows={3} value={b.focus || ""} onChange={(e) => updateRow("blocks", i, { focus: e.target.value })} placeholder="טקסט המיקוד" className="sc-textarea" />
                    <textarea rows={2} value={b.value || ""} onChange={(e) => updateRow("blocks", i, { value: e.target.value })} placeholder="טקסט הערך המרכזי" className="sc-textarea" />
                    <input value={b.tasksLabel || ""} onChange={(e) => updateRow("blocks", i, { tasksLabel: e.target.value })} placeholder="תווית המשימות" />
                    {(b.tasks || []).map((t, ti) => (
                      <div key={ti} className="qrow-edit">
                        <input value={t} onChange={(e) => updateMsTask(i, ti, e.target.value)} placeholder="משימה" />
                        <button className="qicon-btn danger" onClick={() => removeMsTask(i, ti)} title="מחיקה"><Icon name="trash" size={13}/></button>
                      </div>
                    ))}
                    <button className="qadd-btn" onClick={() => addMsTask(i)}>
                      <Icon name="plus" size={13}/> הוסף משימה
                    </button>
                  </>
                )}
              </div>
            ))}

            <div className="qblk-add-row">
              <select value="" onChange={(e) => { if (e.target.value) addBlock(e.target.value); }}>
                <option value="">+ הוסף בלוק...</option>
                <option value="heading">כותרת</option>
                <option value="subheading">כותרת משנה</option>
                <option value="paragraph">פסקה</option>
                <option value="labeled">שורה עם הדגשה</option>
                <option value="milestone">אבן דרך</option>
                <option value="callout">תיבה מודגשת</option>
              </select>
            </div>
          </>
        ))}

        {sec("acct", "ראיית חשבון (אופציונלי)", { toggleable: true, includedKey: "showAccounting", count: data.accountingRows.length }, (
          <>
            <label className="qfield">
              <span>כותרת</span>
              <input value={data.accountingTitle} onChange={(e) => update({ accountingTitle: e.target.value })} />
            </label>
            <label className="qfield">
              <span>פסקת פתיחה</span>
              <textarea rows={2} value={data.accountingLead} onChange={(e) => update({ accountingLead: e.target.value })} />
            </label>
            <label className="qfield">
              <span>באנר עליון בטבלה</span>
              <input value={data.accountingBanner} onChange={(e) => update({ accountingBanner: e.target.value })} />
            </label>

            <div className="qsubtitle">שורות הטבלה</div>
            {data.accountingRows.map((r, i) => (
              <div key={i} className="qrowblock">
                <div className="qrowblock-head">
                  <input value={r.name} onChange={(e) => updateRow("accountingRows", i, { name: e.target.value })} placeholder="שם רכיב" />
                  <button className="qicon-btn danger" onClick={() => removeAt("accountingRows", i)} title="מחיקה"><Icon name="trash" size={13}/></button>
                </div>
                <input value={r.desc} onChange={(e) => updateRow("accountingRows", i, { desc: e.target.value })} placeholder="תיאור" />
                <input value={r.descItalic || ""} onChange={(e) => updateRow("accountingRows", i, { descItalic: e.target.value })} placeholder="הערה (אופציונלי, יוצג בנטוי)" />
                <div className="qgrid">
                  <input value={r.price} onChange={(e) => updateRow("accountingRows", i, { price: e.target.value })} placeholder="מחיר" />
                  <input value={r.when} onChange={(e) => updateRow("accountingRows", i, { when: e.target.value })} placeholder="מועד חיוב" />
                </div>
              </div>
            ))}
            <button className="qadd-btn" onClick={() => appendTo("accountingRows", { name: "", desc: "", descItalic: "", price: "", when: "" })}>
              <Icon name="plus" size={13}/> הוסף שורה
            </button>

            <div className="qsubtitle">סימוני ✓ למטה</div>
            {data.accountingChecks.map((c, i) => (
              <div key={i} className="qrow-edit">
                <input value={c} onChange={(e) => updateAt("accountingChecks", i, e.target.value)} placeholder="טקסט" />
                <button className="qicon-btn danger" onClick={() => removeAt("accountingChecks", i)} title="מחיקה"><Icon name="trash" size={13}/></button>
              </div>
            ))}
            <button className="qadd-btn" onClick={() => appendTo("accountingChecks", "")}>
              <Icon name="plus" size={13}/> הוסף סימון
            </button>
          </>
        ))}

        {sec("refund", "הבטחת החזר", { toggleable: true, includedKey: "showRefund" }, (
          <>
            <label className="qfield">
              <span>כותרת</span>
              <input value={data.refundTitle} onChange={(e) => update({ refundTitle: e.target.value })} />
            </label>
            <label className="qfield">
              <span>תוכן</span>
              <textarea rows={2} value={data.refundBody} onChange={(e) => update({ refundBody: e.target.value })} />
            </label>
          </>
        ))}

        {sec("contact", "פרטי קשר ותוקף", { toggleable: true, includedKey: "showContact" }, (
          <>
            <div className="qgrid">
              <label className="qfield">
                <span>טלפון / וואטסאפ</span>
                <input value={data.phone} onChange={(e) => update({ phone: e.target.value })} dir="ltr" />
              </label>
              <label className="qfield">
                <span>אימייל</span>
                <input value={data.email} onChange={(e) => update({ email: e.target.value })} dir="ltr" />
              </label>
            </div>
            <label className="qfield">
              <span>תוקף ההצעה</span>
              <input value={data.validity} onChange={(e) => update({ validity: e.target.value })} />
            </label>
          </>
        ))}

        {sec("terms", "תנאי הצעה", { toggleable: true, includedKey: "showTerms" }, (
          <>
            <label className="qfield">
              <span>טקסט תנאים</span>
              <textarea rows={5} value={data.termsText} onChange={(e) => update({ termsText: e.target.value })} />
              <small>אפשר להשתמש ב-<code>{"{monthlyPrice}"}</code> ו-<code>{"{fullPrice}"}</code> כפלייסהולדרים.</small>
            </label>
          </>
        ))}

      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={!canSave} onClick={() => onSubmit({
          ...data,
          clientName: data.clientName.trim(),
          businessName: (data.businessName || "").trim() || data.clientName.trim(),
          quoteDate: (data.quoteDate || "").trim() || todayStr,
        })}>
          <Icon name={initial ? "check" : "file-plus"} size={16} /> {initial ? "שמירה" : "יצירת הצעה"}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
      </div>
    </Modal>
  );
};

const ShareModal = ({ open, onClose, doc, onMarkSent, onShareReady, defaultClientEmail }) => {
  const [copied, setCopied] = useStateA(false);
  const [busy, setBusy] = useStateA(false);
  const [err, setErr] = useStateA("");
  const [shareId, setShareId] = useStateA(doc && doc.shareId ? doc.shareId : null);
  const [clientEmail, setClientEmail] = useStateA(defaultClientEmail || (doc && doc.clientEmail) || "");
  const [emailing, setEmailing] = useStateA(false);
  const [emailSent, setEmailSent] = useStateA(false);
  const [emailHint, setEmailHint] = useStateA("");

  useEffectA(() => {
    if (!open || !doc) return;
    setEmailSent(false); setEmailHint("");
    setClientEmail((prev) => prev || (doc.clientEmail || ""));
    if (doc.shareId) { setShareId(doc.shareId); return; }
    setBusy(true); setErr("");
    apiCreateShare(sanitizeForCounterparty(doc))
      .then(({ id }) => { setShareId(id); onShareReady && onShareReady(id); })
      .catch((e) => setErr("נכשלה יצירת קישור — נסה שוב"))
      .finally(() => setBusy(false));
  }, [open, doc && doc.id]);

  if (!doc) return null;
  const url = shareId ? buildShortUrl(shareId) : "טוען...";

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim());

  const sendViaServerEmail = async () => {
    if (!shareId || !validEmail || emailing) return;
    setEmailing(true); setEmailSent(false); setEmailHint("");
    try {
      const r = await fetch(`/api/share?id=${encodeURIComponent(shareId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail: clientEmail.trim(), kind: "invite" }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 503) {
          // Email not configured server-side — fall back to mailto:
          window.open(`mailto:${encodeURIComponent(clientEmail.trim())}?subject=${encodeURIComponent("מסמך לחתימה: " + doc.name)}&body=${encodeURIComponent("שלום,\n\nמצורף קישור לחתימה על המסמך:\n" + url + "\n\nתודה!")}`);
          setEmailHint("נפתח אצלך לקוח המייל — שלח/י ידנית. (לשליחה אוטומטית, נדרשת התקנת מפתח Resend בשרת)");
        } else {
          setEmailHint(data.error || "שליחה נכשלה");
        }
      } else {
        setEmailSent(true);
        setEmailHint("המייל נשלח אל הצד השני בהצלחה.");
        // Persist email choice locally for next-time prefill
        try { localStorage.setItem("flowbiz-last-client-email", clientEmail.trim()); } catch {}
      }
    } catch (e) {
      setEmailHint("שליחה נכשלה — נסה שוב");
    } finally {
      setEmailing(false);
    }
  };

  const copy = () => {
    if (!shareId) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Modal open={open} onClose={onClose} wide
    title="שלח לחתימה"
    subtitle={`הקישור הזה ייפתח אצל ${DOC_TEMPLATES[doc.template]?.counterparty || "הצד השני"} עם המסמך החתום מצידך וההזמנה להשלים את החתימה.`}>
      
      <div className="share-link-row">
        <input value={url} readOnly onClick={(e) => e.target.select()} />
        <button className="btn btn-primary btn-sm" onClick={copy}>
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "הועתק!" : "העתקה"}
        </button>
      </div>

      <div className="share-channels">
        <button className="channel-btn" disabled={!shareId} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("שלום, מצורף קישור לחתימה על המסמך: " + url)}`)}>
          <div className="channel-icon" style={{ background: "#25D366" }}><Icon name="whatsapp" size={22} color="#fff" /></div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>WhatsApp</div>
        </button>
        <button className="channel-btn" disabled={!shareId} onClick={() => window.open(`mailto:?subject=${encodeURIComponent("מסמך לחתימה: " + doc.name)}&body=${encodeURIComponent("שלום,\n\nמצורף קישור לחתימה על המסמך:\n" + url + "\n\nתודה!")}`)}>
          <div className="channel-icon" style={{ background: "var(--blue-500)" }}><Icon name="mail" size={20} color="#fff" /></div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>אימייל ידני</div>
        </button>
        <button className="channel-btn" disabled={!shareId} onClick={copy}>
          <div className="channel-icon" style={{ background: "var(--gray-700)" }}><Icon name="link" size={18} color="#fff" /></div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>העתק קישור</div>
        </button>
      </div>

      <div className="share-email-block">
        <div className="share-email-title">
          <Icon name="send" size={14} color="var(--blue-600)" /> שליחה אוטומטית במייל
        </div>
        <div className="share-email-row">
          <input
            type="email" dir="ltr" placeholder="client@example.com"
            value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
            className="share-email-input"
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={!shareId || !validEmail || emailing || emailSent}
            onClick={sendViaServerEmail}
          >
            <Icon name={emailSent ? "check" : "send"} size={14} />
            {emailing ? "שולח..." : emailSent ? "נשלח" : "שלח קישור"}
          </button>
        </div>
        {emailHint && (
          <div className={"share-email-hint " + (emailSent ? "ok" : "")}>{emailHint}</div>
        )}
        <div className="share-email-foot">
          לאחר שהצד השני יחתום וישלח חזרה, יישלח אליו עותק חתום למייל זה אוטומטית.
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12, background: "var(--red-50)", border: "1px solid #FCA5A5", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
          <Icon name="info" size={18} color="var(--red-600)" />
          <div style={{ fontSize: 12.5, color: "var(--red-600)" }}>{err}</div>
        </div>
      )}
      <div style={{ marginTop: 22, background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon name="shield-check" size={18} color="var(--blue-600)" />
        <div style={{ fontSize: 12.5, color: "var(--blue-800)", lineHeight: 1.55 }}>
          {busy
            ? "מייצר קישור מקוצר ומאובטח..."
            : "הקישור קצר ומקצועי. הצד השני רואה אך ורק את חלון החתימה, ללא גישה לממשק שלך. ברגע שיחתום, העותק החתום יחזור אוטומטית לספריית המסמכים שלך."}
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-primary" onClick={() => { onMarkSent && onMarkSent(); onClose(); }}>
          <Icon name="arrow-right" size={16} /> סיימתי — חזרה למסמכים
        </button>
      </div>
    </Modal>);

};

const SavedSignaturesModal = ({ open, onClose, refreshKey, onDrawNew, highlightId }) => {
  const [sigs, setSigs] = useStateA(() => loadSavedSignatures());
  const fileRef = React.useRef(null);
  const highlightInputRef = React.useRef(null);

  useEffectA(() => {
    if (open) setSigs(loadSavedSignatures());
  }, [open, refreshKey]);

  // When a new signature was just added (and the modal is showing it), auto-focus
  // its name input and scroll it into view so the user can immediately type a name.
  useEffectA(() => {
    if (!open || !highlightId) return;
    const t = setTimeout(() => {
      const el = highlightInputRef.current;
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
        try { el.focus(); el.select(); } catch {}
      }
    }, 80);
    return () => clearTimeout(t);
  }, [open, highlightId, refreshKey]);

  const persist = (next) => { setSigs(next); saveSavedSignatures(next); };

  const onUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert("גודל מקסימלי לחתימה: 4MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const fname = (file.name || "חתימה").replace(/\.(png|jpg|jpeg|svg)$/i, "");
      const fresh = { id: "sig-" + genId(), name: fname, dataUrl: reader.result, createdAt: Date.now() };
      persist([fresh, ...sigs]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateName = (id, name) => persist(sigs.map((s) => s.id === id ? { ...s, name } : s));
  const deleteSig = (id) => {
    if (!confirm("למחוק את החתימה השמורה?")) return;
    persist(sigs.filter((s) => s.id !== id));
  };

  return (
    <Modal open={open} onClose={onClose} wide
      title="החתימות השמורות שלי"
      subtitle="העלה קבצי חתימה (PNG עם רקע שקוף הכי טוב), תן/תני לכל אחת שם — והמערכת תשבץ אותן אוטומטית במסמכים לפי שם המורשה (למשל בהחלטות העברה בנקאית).">

      <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/svg+xml" onChange={onUpload} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>
            <Icon name="upload-cloud" size={14} /> העלאת חתימה
          </button>
          {onDrawNew && (
            <button className="btn btn-secondary btn-sm" onClick={onDrawNew}>
              <Icon name="pen-tool" size={14} /> ציור חתימה חדשה
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--gray-500)" }}>{sigs.length} חתימות שמורות</span>
      </div>

      {sigs.length === 0 ? (
        <div className="saved-sigs-empty">
          <div className="saved-sigs-empty-circle"><Icon name="pen-tool" size={28} color="#fff" /></div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--blue-900)", marginTop: 10 }}>אין חתימות שמורות עדיין</div>
          <div style={{ fontSize: 12.5, color: "var(--gray-500)", marginTop: 4, textAlign: "center", maxWidth: 360 }}>
            העלה תמונה של חתימה ותן לה את השם של המורשה (לדוגמה "אורי אשר"). פעם הבאה שתיצור החלטה עם המורשה הזה — החתימה תופיע אוטומטית.
          </div>
        </div>
      ) : (
        <div className="saved-sigs-list">
          {sigs.map((s) => {
            const isHighlight = highlightId === s.id;
            return (
              <div key={s.id} className={"saved-sig-item " + (isHighlight ? "highlighted" : "")}>
                <div className="saved-sig-preview"><img src={s.dataUrl} alt={s.name} /></div>
                <input
                  ref={isHighlight ? highlightInputRef : null}
                  className="saved-sig-name"
                  value={s.name}
                  onChange={(e) => updateName(s.id, e.target.value)}
                  placeholder="שם המורשה (לדוגמה: אורי אשר)"
                />
                <button className="qicon-btn danger" onClick={() => deleteSig(s.id)} title="מחיקה"><Icon name="trash" size={13} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16, background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: 12, padding: "10px 12px", fontSize: 12, color: "var(--blue-800)", lineHeight: 1.55 }}>
        <strong>טיפ:</strong> שם החתימה חייב להיות זהה בדיוק לשם המורשה במסמך כדי שתשובץ אוטומטית. אפשר לערוך את שם החתימה כאן בכל זמן.
      </div>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>סגירה</button>
      </div>
    </Modal>
  );
};

const BankTransferFormModal = ({ open, onClose, onSubmit, initial, suggestedResolutionNumber, onOpenSavedSigs, onVendorsChanged }) => {
  const seedData = () => {
    const base = window.normalizeBankTransferData ? window.normalizeBankTransferData(initial) : { ...(initial || {}) };
    if (!base.date) base.date = todayDateString();
    if (!base.resolutionNumber && !initial) base.resolutionNumber = suggestedResolutionNumber || "";
    return base;
  };

  const [data, setData] = useStateA(seedData);
  const [openSection, setOpenSection] = useStateA("decision");
  const [vendors, setVendors] = useStateA(() => loadVendors());
  const [selectedVendorId, setSelectedVendorId] = useStateA("");

  useEffectA(() => {
    if (open) {
      const fresh = seedData();
      setData(fresh);
      setOpenSection("decision");
      setVendors(loadVendors());
      // If editing an existing doc, try to match an existing vendor
      const match = (loadVendors() || []).find((v) =>
        v.name === fresh.beneficiaryName &&
        v.account === fresh.beneficiaryAccount
      );
      setSelectedVendorId(match ? match.id : "");
    }
  }, [open]);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const updateRow = (key, i, patch) => setData((d) => ({ ...d, [key]: d[key].map((r, idx) => idx === i ? { ...r, ...patch } : r) }));
  const removeAt = (key, i) => setData((d) => ({ ...d, [key]: d[key].filter((_, idx) => idx !== i) }));
  const appendTo = (key, value) => setData((d) => ({ ...d, [key]: [...d[key], value] }));

  const pickVendor = (id) => {
    setSelectedVendorId(id);
    if (!id) return;
    const v = vendors.find((x) => x.id === id);
    if (!v) return;
    update({
      beneficiaryName: v.name || "",
      beneficiaryBank: v.bank || "",
      beneficiaryBranch: v.branch || "",
      beneficiaryAccount: v.account || "",
      paymentPurpose: v.purpose || data.paymentPurpose,
    });
  };

  const persistVendors = (next) => { setVendors(next); saveVendors(next); if (onVendorsChanged) onVendorsChanged(); };

  const saveAsNewVendor = () => {
    const name = (data.beneficiaryName || "").trim();
    if (!name) { alert("יש למלא שם מוטב לפני שמירה כספק"); return; }
    const v = {
      id: "v-" + genId(),
      name,
      bank: data.beneficiaryBank || "",
      branch: data.beneficiaryBranch || "",
      account: data.beneficiaryAccount || "",
      purpose: data.paymentPurpose || "",
      createdAt: Date.now(),
    };
    persistVendors([v, ...vendors]);
    setSelectedVendorId(v.id);
  };

  const updateSelectedVendor = () => {
    if (!selectedVendorId) return;
    const next = vendors.map((v) => v.id === selectedVendorId ? {
      ...v,
      name: (data.beneficiaryName || "").trim(),
      bank: data.beneficiaryBank || "",
      branch: data.beneficiaryBranch || "",
      account: data.beneficiaryAccount || "",
      purpose: data.paymentPurpose || "",
    } : v);
    persistVendors(next);
  };

  const deleteSelectedVendor = () => {
    if (!selectedVendorId) return;
    if (!confirm("למחוק את הספק השמור?")) return;
    persistVendors(vendors.filter((v) => v.id !== selectedVendorId));
    setSelectedVendorId("");
  };

  const autoFillWords = () => {
    const n = parseInt(String(data.amount).replace(/[^\d]/g, ""), 10);
    if (!n || isNaN(n)) return;
    const words = window.numberToHebrewWords ? window.numberToHebrewWords(n) : "";
    if (words) update({ amountWords: words });
  };

  const sec = (id, title, opts, children) => (
    <QuoteFormSection
      key={id}
      title={title}
      toggleable={!!opts.toggleable}
      included={opts.includedKey ? !!data[opts.includedKey] : true}
      count={opts.count}
      isOpen={openSection === id}
      onToggleOpen={() => setOpenSection(openSection === id ? null : id)}
      onToggleIncluded={opts.includedKey ? (v) => update({ [opts.includedKey]: v }) : undefined}
    >
      {children}
    </QuoteFormSection>
  );

  const canSave = (data.beneficiaryName || "").trim().length > 0 && (data.amount || "").toString().trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} wide noScrimClose
      title={initial ? "עריכת החלטת העברה" : "החלטת העברה בנקאית חדשה"}
      subtitle="מלא/י את פרטי ההעברה. אפשר לבחור ספק שמור כדי לטעון את פרטי החשבון בלחיצה אחת.">
      <div className="qform">

        {sec("decision", "פרטי החלטה", {}, (
          <>
            <div className="qgrid">
              <label className="qfield">
                <span>מספר החלטה</span>
                <input value={data.resolutionNumber} onChange={(e) => update({ resolutionNumber: e.target.value })} dir="ltr" placeholder="AOT-2026-1191" />
              </label>
              <label className="qfield">
                <span>תאריך</span>
                <input value={data.date} onChange={(e) => update({ date: e.target.value })} dir="ltr" placeholder="DD.MM.YYYY" />
              </label>
            </div>
            <label className="qfield">
              <span>סוג ההעברה</span>
              <input value={data.type} onChange={(e) => update({ type: e.target.value })} placeholder="העברה חד-פעמית" />
            </label>
          </>
        ))}

        {sec("amount", "סכום", {}, (
          <>
            <div className="qgrid">
              <label className="qfield">
                <span>סכום (מספר)</span>
                <input value={data.amount} onChange={(e) => update({ amount: e.target.value })} dir="ltr" placeholder="4720" />
              </label>
              <label className="qfield">
                <span>מטבע</span>
                <input value={data.currency} onChange={(e) => update({ currency: e.target.value })} />
              </label>
            </div>
            <label className="qfield">
              <span>סכום במילים</span>
              <input value={data.amountWords} onChange={(e) => update({ amountWords: e.target.value })} placeholder="ארבעת אלפים ושבע מאות ועשרים" />
              <button type="button" className="qadd-btn" style={{ alignSelf: "flex-start", marginTop: 6 }} onClick={autoFillWords}>
                <Icon name="sparkles" size={13} /> השלמה אוטומטית מהמספר
              </button>
            </label>
          </>
        ))}

        {sec("source", "חשבון החברה (מקור)", {}, (
          <>
            <div className="qgrid">
              <label className="qfield">
                <span>שם הבנק</span>
                <input value={data.sourceBank} onChange={(e) => update({ sourceBank: e.target.value })} />
              </label>
              <label className="qfield">
                <span>קוד בנק</span>
                <input value={data.sourceBankCode} onChange={(e) => update({ sourceBankCode: e.target.value })} dir="ltr" />
              </label>
            </div>
            <div className="qgrid">
              <label className="qfield">
                <span>מספר סניף</span>
                <input value={data.sourceBranchNumber} onChange={(e) => update({ sourceBranchNumber: e.target.value })} dir="ltr" />
              </label>
              <label className="qfield">
                <span>שם סניף</span>
                <input value={data.sourceBranchName} onChange={(e) => update({ sourceBranchName: e.target.value })} />
              </label>
            </div>
            <label className="qfield">
              <span>מספר חשבון</span>
              <input value={data.sourceAccount} onChange={(e) => update({ sourceAccount: e.target.value })} dir="ltr" />
            </label>
          </>
        ))}

        {sec("vendor", "מוטב (ספק)", {}, (
          <>
            <div className="bt-vendor-pick">
              <select value={selectedVendorId} onChange={(e) => pickVendor(e.target.value)}>
                <option value="">— ספק חדש —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.account ? ` · ${v.account}` : ""}</option>
                ))}
              </select>
              {!selectedVendorId ? (
                <button type="button" className="btn btn-soft btn-sm" onClick={saveAsNewVendor}>
                  <Icon name="plus" size={13} /> שמור כספק
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-soft btn-sm" onClick={updateSelectedVendor}>
                    <Icon name="check" size={13} /> עדכן ספק
                  </button>
                  <button type="button" className="btn btn-danger-ghost btn-sm" onClick={deleteSelectedVendor}>
                    <Icon name="trash" size={13} /> מחק
                  </button>
                </>
              )}
            </div>
            <p className="bt-vendor-hint">
              בחירת ספק שמור תטען אוטומטית את שם המוטב, בנק, סניף, חשבון ומטרת תשלום. ניתן לערוך לפני שמירה.
            </p>
            <label className="qfield">
              <span>שם המוטב</span>
              <input value={data.beneficiaryName} onChange={(e) => update({ beneficiaryName: e.target.value })} placeholder="לדוגמה: רן ברנפלד" />
            </label>
            <div className="qgrid">
              <label className="qfield">
                <span>שם הבנק של המוטב</span>
                <input value={data.beneficiaryBank} onChange={(e) => update({ beneficiaryBank: e.target.value })} placeholder="בינלאומי" />
              </label>
              <label className="qfield">
                <span>סניף</span>
                <input value={data.beneficiaryBranch} onChange={(e) => update({ beneficiaryBranch: e.target.value })} dir="ltr" />
              </label>
            </div>
            <div className="qgrid">
              <label className="qfield">
                <span>מספר חשבון</span>
                <input value={data.beneficiaryAccount} onChange={(e) => update({ beneficiaryAccount: e.target.value })} dir="ltr" />
              </label>
              <label className="qfield">
                <span>מטרת התשלום</span>
                <input value={data.paymentPurpose} onChange={(e) => update({ paymentPurpose: e.target.value })} placeholder="לדוגמה: שירותי תכנות" />
              </label>
            </div>
          </>
        ))}

        {sec("signers", "מורשי חתימה", { count: data.signatories.length }, (
          <>
            {data.signatories.map((s, i) => (
              <div key={i} className="qrowblock">
                <div className="qrowblock-head">
                  <input value={s.name} onChange={(e) => updateRow("signatories", i, { name: e.target.value })} placeholder="שם מלא" />
                  <button className="qicon-btn danger" onClick={() => removeAt("signatories", i)} title="מחיקה" disabled={data.signatories.length <= 1}><Icon name="trash" size={13}/></button>
                </div>
                <input value={s.id} onChange={(e) => updateRow("signatories", i, { id: e.target.value })} dir="ltr" placeholder="ת.ז" />
              </div>
            ))}
            <button className="qadd-btn" onClick={() => appendTo("signatories", { name: "", id: "" })}>
              <Icon name="plus" size={13}/> הוסף מורשה חתימה
            </button>
          </>
        ))}

        {sec("summary", "טבלת סיכום", { toggleable: true, includedKey: "showSummary" }, (
          <p className="bt-vendor-hint">טבלת הסיכום מציגה את הפרטים בצורה מסודרת אחרי טקסט ההחלטה. ניתן להסתיר אם הטקסט בעצמו מספיק.</p>
        ))}

        {sec("disclaimer", "טקסט תקנון/הערות", { toggleable: true, includedKey: "showDisclaimer" }, (
          <label className="qfield">
            <span>הערות בתחתית המסמך</span>
            <textarea rows={5} value={data.disclaimerText} onChange={(e) => update({ disclaimerText: e.target.value })} />
          </label>
        ))}

      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={!canSave} onClick={() => onSubmit({
          ...data,
          beneficiaryName: (data.beneficiaryName || "").trim(),
          amount: String(data.amount || "").trim(),
          date: (data.date || "").trim() || todayDateString(),
        })}>
          <Icon name={initial ? "check" : "file-plus"} size={16} /> {initial ? "שמירה" : "יצירת החלטה"}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
      </div>
    </Modal>
  );
};

// Plain section divider (no accordion) — the sales-call form is single-flow:
// everything's visible, just scroll top-to-bottom.
const ScSection = ({ title, children }) => (
  <div className="sc-form-section">
    <div className="sc-form-section-title">{title}</div>
    <div className="sc-form-section-body">{children}</div>
  </div>
);

// CheckRow and TextArea MUST live at module level — defining them inside the
// modal would give them a fresh component identity on every keystroke, which
// makes React unmount/remount the input and lose focus + scroll position.
const ScCheckRow = ({ checked, onChange, label }) => (
  <label className="sc-check-row">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);
const ScTextArea = ({ value, onChange, placeholder, rows = 2 }) => (
  <textarea
    rows={rows}
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder || ""}
    className="sc-textarea"
  />
);

const SalesCallFormModal = ({ open, onClose, onSubmit, initial }) => {
  const seedData = () => {
    const base = window.normalizeSalesCallData ? window.normalizeSalesCallData(initial) : { ...(initial || {}) };
    if (!initial) {
      if (!base.callDate) base.callDate = todayDateString();
      if (!base.callTime) base.callTime = nowTimeString();
    }
    return base;
  };

  const [data, setData] = useStateA(seedData);

  useEffectA(() => {
    if (open) setData(seedData());
  }, [open]);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const canSave = (data.clientName || "").trim().length > 0;

  // Tiny key-bound wrappers to keep the JSX terse without recreating components.
  const cbk = (k) => ({ checked: !!data[k], onChange: (v) => update({ [k]: v }) });
  const txk = (k) => ({ value: data[k], onChange: (v) => update({ [k]: v }) });

  return (
    <Modal open={open} onClose={onClose} wide noScrimClose
      title={initial ? "עריכת סיכום שיחה" : "סיכום שיחת מכירה חדש"}
      subtitle="מלא/י את השדות הרלוונטיים — הכל בזרימה אחת. ניתן לחזור ולערוך מאוחר יותר.">
      <div className="qform sc-form-flow">

        <ScSection title="פרטי לקוח ופגישה">
          <label className="qfield">
            <span>שם הלקוח <span className="req">*</span></span>
            <input value={data.clientName} onChange={(e) => update({ clientName: e.target.value })} placeholder="שם פרטי + שם משפחה" autoFocus />
          </label>
          <div className="qgrid">
            <label className="qfield">
              <span>תאריך השיחה</span>
              <input value={data.callDate} onChange={(e) => update({ callDate: e.target.value })} dir="ltr" placeholder="DD.MM.YYYY" />
            </label>
            <label className="qfield">
              <span>שעה</span>
              <input value={data.callTime} onChange={(e) => update({ callTime: e.target.value })} dir="ltr" placeholder="14:30" />
            </label>
          </div>
        </ScSection>

        <ScSection title="פתיחה (סימוני ✓)">
          <ScCheckRow {...cbk("smallTalkDone")} label="סמול טוק ויצירת קשר ראשוני" />
          <ScCheckRow {...cbk("goalsIntroDone")} label='הצגת מטרות + העסק שלנו (עד 2 דקות) + איך תיראה הפגישה' />
        </ScSection>

        <ScSection title="שאלות גילוי">
          <label className="qfield"><span>1. מה אתה עושה כיום?</span><ScTextArea {...txk("q1_currentJob")} /></label>
          <label className="qfield"><span>2. מה העסק שאת/ה רוצה להקים? יש לך כבר רעיון מגובש?</span><ScTextArea {...txk("q2_businessIdea")} /></label>
          <label className="qfield"><span>3. למה דווקא העסק הזה?</span><ScTextArea {...txk("q3_whyBusiness")} /></label>
          <label className="qfield"><span>4. מה עצר אותך עד עכשיו?</span><ScTextArea {...txk("q4_whatStopped")} /></label>
          <label className="qfield"><span>5. למה דווקא עכשיו?</span><ScTextArea {...txk("q5_whyNow")} /></label>
          <label className="qfield"><span>6. כמה זמן את/ה מוכן להשקיע בעסק בשבוע?</span><ScTextArea {...txk("q6_timeWeek")} /></label>
          <label className="qfield"><span>7. כמה אתה רוצה שהעסק יכניס לך?</span><ScTextArea {...txk("q7_targetIncome")} /></label>
        </ScSection>

        <ScSection title="שאלות פתיחת הדגמה">
          <ScCheckRow {...cbk("demoQ1_check")} label='“נניח ואני מראה לך עכשיו את המערכת והיא פותרת לך את מה שתיארת — מה צריך לקרות כדי שתצא מהשיחה הזו ותרגיש שעשית את הצעד הנכון?”' />
          <label className="qfield">
            <span>תשובת הלקוח (אופציונלי)</span>
            <ScTextArea {...txk("demoQ1_note")} placeholder="תקציר התשובה" />
          </label>
          <label className="qfield">
            <span>מ-1 עד 10, כמה את/ה רוצה להקים את העסק?</span>
            <input value={data.demoQ2_rating} onChange={(e) => update({ demoQ2_rating: e.target.value })} dir="ltr" placeholder="1—10" />
          </label>
        </ScSection>

        <ScSection title="הצגת פתרון ומחיר (סימוני ✓)">
          <ScCheckRow {...cbk("solutionPresented")} label="הצגת פתרון ופיצ׳רים לפי בעיות שהעלה הלקוח" />
          <ScCheckRow {...cbk("pricingPresented")} label="הצגת מחיר" />
          <ScCheckRow {...cbk("letClientReact")} label='לאחר ההצגה — לתת ללקוח להגיב ראשון' />
        </ScSection>

        <ScSection title="תוצאה">
          <ScCheckRow {...cbk("purchased")} label="התבצעה רכישה?" />
          {data.purchased && (
            <>
              <label className="qfield">
                <span>סוג התכנית</span>
                <div className="qradio-row">
                  <label className="qradio">
                    <input type="radio" name="purchaseType" checked={data.purchaseType === "regular"} onChange={() => update({ purchaseType: "regular" })} />
                    <span>תכנית רגילה</span>
                  </label>
                  <label className="qradio">
                    <input type="radio" name="purchaseType" checked={data.purchaseType === "special"} onChange={() => update({ purchaseType: "special" })} />
                    <span>תכנית מיוחדת</span>
                  </label>
                </div>
              </label>
              {data.purchaseType === "special" && (
                <label className="qfield">
                  <span>פירוט התכנית המיוחדת</span>
                  <ScTextArea {...txk("purchaseDetails")} rows={3} placeholder="הנחה / חבילה משולבת / תשלומים מיוחדים / וכו" />
                </label>
              )}
            </>
          )}
          <label className="qfield">
            <span>התנגדויות / חששות שעלו</span>
            <ScTextArea {...txk("objections")} placeholder="לדוגמה: יקר מדי, אין זמן, אני צריך לחשוב..." />
          </label>
        </ScSection>

        <ScSection title="סיכום שיחה">
          <label className="qfield">
            <span>סיכום</span>
            <ScTextArea {...txk("summary")} rows={6} placeholder="נקודות עיקריות, רגעים מכריעים, מה עבד / לא עבד" />
          </label>
        </ScSection>

        <ScSection title="מעקב פנימי">
          <ScCheckRow {...cbk("uploadedToMonday")} label="הועלה לכרטיס לקוח ב-Monday" />
        </ScSection>

      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={!canSave} onClick={() => onSubmit({
          ...data,
          clientName: (data.clientName || "").trim(),
        })}>
          <Icon name={initial ? "check" : "file-plus"} size={16} /> {initial ? "שמירה" : "יצירת סיכום"}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
      </div>
    </Modal>
  );
};

const LoginModal = ({ open, onLogin }) => {
  const [email, setEmail] = useStateA("");
  const [pwd, setPwd] = useStateA("");
  const [err, setErr] = useStateA("");
  const [busy, setBusy] = useStateA(false);

  if (!open) return null;

  const submit = async () => {
    setErr("");
    const e = email.trim().toLowerCase();
    const match = ADMIN_USERS.find((u) => u.email === e && u.pwd === pwd);
    if (!match) { setErr("אימייל או סיסמה שגויים"); return; }
    const basicAuth = "Basic " + btoa(unescape(encodeURIComponent(`${match.email}:${match.pwd}`)));
    setBusy(true);
    try {
      const r = await fetch("/api/admin/state", { headers: { "Authorization": basicAuth }, cache: "no-store" });
      if (r.status === 401) { setErr("הסיסמה אומתה מקומית אך השרת דחה — נסה/י שוב"); return; }
      onLogin({ email: match.email, basicAuth, loggedInAt: Date.now() });
    } catch (ex) {
      setErr("שגיאת תקשורת — נסה/י שוב");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-scrim">
      <div className="login-card">
        <img src="/assets/logo.png" alt="FlowBiz" className="login-logo" onError={(e) => (e.target.style.display = "none")} />
        <h2>FlowBiz Sign · ניהול</h2>
        <p>גישה מנהלית בלבד. כניסה תיתן לך גישה לכל המסמכים, החתימות והספקים — מסונכרן בין כל המנהלים.</p>
        <label className="login-field">
          <span>אימייל</span>
          <input type="email" dir="ltr" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="orias3@gmail.com" autoFocus />
        </label>
        <label className="login-field">
          <span>סיסמה</span>
          <input type="password" dir="ltr" autoComplete="current-password" value={pwd} onChange={(ev) => setPwd(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && submit()} placeholder="••••••••" />
        </label>
        {err && <div className="login-err"><Icon name="info" size={14} /> {err}</div>}
        <button className="btn btn-primary" disabled={busy || !email || !pwd} onClick={submit} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          <Icon name={busy ? "clock" : "shield-check"} size={16} /> {busy ? "מאמת..." : "כניסה"}
        </button>
        <p className="login-foot">חיבור מאובטח · המסמכים נשמרים בענן ומסונכרנים בין מנהלים</p>
      </div>
    </div>
  );
};

const App = () => {
  const [docs, setDocs] = useStateA(() => loadDocs() || DEFAULT_DOCS);
  const [mySignature, setMySignature] = useStateA(() => loadSig());
  const [view, setView] = useStateA("library"); // library | editor | counterparty
  const [activeDocId, setActiveDocId] = useStateA(null);
  const [sigOpen, setSigOpen] = useStateA(false);
  const [sigAfter, setSigAfter] = useStateA(null);
  const [shareOpen, setShareOpen] = useStateA(false);
  const [toast, setToast] = useStateA("");
  const [quoteFormOpen, setQuoteFormOpen] = useStateA(false);
  const [quoteFormEditingId, setQuoteFormEditingId] = useStateA(null);
  const [btFormOpen, setBtFormOpen] = useStateA(false);
  const [btFormEditingId, setBtFormEditingId] = useStateA(null);
  const [scFormOpen, setScFormOpen] = useStateA(false);
  const [scFormEditingId, setScFormEditingId] = useStateA(null);
  const [savedSigsOpen, setSavedSigsOpen] = useStateA(false);
  const [savedSigsRefreshKey, setSavedSigsRefreshKey] = useStateA(0);
  const [highlightSigId, setHighlightSigId] = useStateA(null);
  const [sigDefaultMode, setSigDefaultMode] = useStateA("auto");
  const [sigUpdateMain, setSigUpdateMain] = useStateA(true);
  const [sharedDoc, setSharedDoc] = useStateA(null);   // doc fetched from API (client view)
  const [sharedId, setSharedId] = useStateA(null);     // share id of the doc currently open in client view
  const [shareError, setShareError] = useStateA(false);
  const [shareLoading, setShareLoading] = useStateA(false);
  // Admin auth + sync state
  const [adminAuth, setAdminAuth] = useStateA(() => loadAdminAuth());
  const [bootingAdmin, setBootingAdmin] = useStateA(false);
  const [vendorBump, setVendorBump] = useStateA(0);
  const isClientRoute = (typeof window !== "undefined") && /^\/s\//i.test(window.location.pathname);
  const requiresAuth = !isClientRoute;

  useEffectA(() => {saveDocs(docs);}, [docs]);
  useEffectA(() => {if (mySignature) saveSig(mySignature);}, [mySignature]);

  // ── Refs for the admin sync state machine ───────────────────────────────
  const docsRef = React.useRef(docs);
  useEffectA(() => { docsRef.current = docs; }, [docs]);
  // The last `docs` array we *applied from the server*. Used to distinguish a
  // local change from a remote-applied change in the push effect — without
  // this, the setDocs call from a pull would itself trigger a push.
  const lastAppliedDocsRef = React.useRef(null);
  // The lastUpdated timestamp + version we have locally synchronized with.
  const lastSyncedTsRef = React.useRef(0);
  const lastSyncedVersionRef = React.useRef(0);
  // Push concurrency: only one push at a time. If new changes arrive during
  // an in-flight push, morePending stays true so the loop runs again with the
  // freshest state.
  const isPushingRef = React.useRef(false);
  const morePendingRef = React.useRef(false);
  // Pull concurrency: queue if we're in the middle of a push (otherwise the
  // server's reply might be stale relative to the change we're about to send).
  const queuedPullRef = React.useRef(false);
  const isApplyingRemoteRef = React.useRef(false);
  // Mutable refs to the push/pull functions so they can call each other
  // without circular dependency hell.
  const doPushRef = React.useRef(null);
  const doPullRef = React.useRef(null);

  // PUSH — sends the latest local state. Loops if more changes accumulated
  // during the network round-trip.
  doPushRef.current = async () => {
    if (!adminAuth) return;
    if (isPushingRef.current) { morePendingRef.current = true; return; }
    isPushingRef.current = true;
    morePendingRef.current = false;
    try {
      // Loop while changes keep accumulating
      // eslint-disable-next-line no-constant-condition
      while (true) {
        morePendingRef.current = false;
        const snapshot = {
          docs: docsRef.current,
          vendors: loadVendors(),
          savedSignatures: loadSavedSignatures(),
          _clientLastSeenVersion: lastSyncedVersionRef.current,
        };
        const res = await apiAdminStatePut(snapshot, adminAuth);
        if (res && res.unauthorized) {
          clearAdminAuth(); setAdminAuth(null);
          break;
        }
        if (res && res.conflict) {
          // Someone else wrote first. Accept their state, lose this push's edits.
          // For 2-user low-conflict use this is acceptable; the next change
          // will push again with the merged base.
          if (res.currentState) {
            isApplyingRemoteRef.current = true;
            const cs = res.currentState;
            lastSyncedTsRef.current = (cs._meta && cs._meta.lastUpdated) || 0;
            lastSyncedVersionRef.current = (cs._meta && cs._meta.version) || 0;
            if (Array.isArray(cs.docs)) {
              lastAppliedDocsRef.current = cs.docs;
              setDocs(cs.docs);
            }
            if (Array.isArray(cs.savedSignatures)) saveSavedSignatures(cs.savedSignatures);
            if (Array.isArray(cs.vendors)) saveVendors(cs.vendors);
            setSavedSigsRefreshKey((k) => k + 1);
            setVendorBump((v) => v + 1);
            setTimeout(() => { isApplyingRemoteRef.current = false; }, 50);
          }
          break;
        }
        if (res && res._meta) {
          lastSyncedTsRef.current = res._meta.lastUpdated;
          lastSyncedVersionRef.current = res._meta.version;
        }
        if (!morePendingRef.current) break;
      }
    } catch (e) {
      console.error("admin push failed", e);
      morePendingRef.current = true; // try again on next change
    } finally {
      isPushingRef.current = false;
      if (queuedPullRef.current && !morePendingRef.current) {
        queuedPullRef.current = false;
        doPullRef.current && doPullRef.current();
      }
    }
  };

  // PULL — checks for newer state on the server. SKIPPED if we have local
  // changes pending or are currently pushing — never overwrite unsaved edits.
  doPullRef.current = async () => {
    if (!adminAuth) return;
    if (isPushingRef.current || morePendingRef.current) {
      queuedPullRef.current = true;
      return;
    }
    try {
      const state = await apiAdminStateGet(adminAuth);
      if (!state || state.unauthorized) {
        clearAdminAuth(); setAdminAuth(null);
        return;
      }
      const remoteExists = state._meta && state._meta.exists;
      const remoteTs = (state._meta && state._meta.lastUpdated) || 0;
      const remoteVer = (state._meta && state._meta.version) || 0;

      if (!remoteExists) {
        // First-time seed: push our local DEFAULT_DOCS/whatever as the initial state
        if (doPushRef.current) doPushRef.current();
        return;
      }

      if (remoteTs <= lastSyncedTsRef.current) return; // nothing new

      isApplyingRemoteRef.current = true;
      lastSyncedTsRef.current = remoteTs;
      lastSyncedVersionRef.current = remoteVer;
      if (Array.isArray(state.docs)) {
        lastAppliedDocsRef.current = state.docs;
        setDocs(state.docs);
      }
      if (Array.isArray(state.savedSignatures)) saveSavedSignatures(state.savedSignatures);
      if (Array.isArray(state.vendors)) saveVendors(state.vendors);
      setSavedSigsRefreshKey((k) => k + 1);
      setVendorBump((v) => v + 1);
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 50);
    } catch (e) {
      console.error("admin pull failed", e);
    }
  };

  // On login, pull once
  useEffectA(() => {
    if (!adminAuth) return;
    setBootingAdmin(true);
    if (doPullRef.current) doPullRef.current();
    // Booting flag doesn't really need to await; pull is fire-and-forget
    setTimeout(() => setBootingAdmin(false), 600);
  }, [adminAuth]);

  // Pull on window focus
  useEffectA(() => {
    if (!adminAuth) return;
    const onFocus = () => { if (doPullRef.current) doPullRef.current(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [adminAuth]);

  // Push on local docs change. Skips if the change came from applying remote
  // state (the lastAppliedDocsRef === current docs check).
  useEffectA(() => {
    if (!adminAuth) return;
    if (docs === lastAppliedDocsRef.current) return;
    if (doPushRef.current) doPushRef.current();
  }, [docs, adminAuth]);

  // Push on saved-sigs / vendors change. The isApplyingRemote gate prevents
  // an apply-remote from re-pushing immediately.
  useEffectA(() => {
    if (!adminAuth) return;
    if (isApplyingRemoteRef.current) return;
    // Skip the very first mount fire (counters start at 0)
    if (savedSigsRefreshKey === 0 && vendorBump === 0) return;
    if (doPushRef.current) doPushRef.current();
  }, [savedSigsRefreshKey, vendorBump, adminAuth]);

  // URL routing — /s/<id> path is hard-locked to the client signing view.
  useEffectA(() => {
    const check = async () => {
      const pathMatch = location.pathname.match(/^\/s\/([a-z0-9]+)$/i);
      const hashSignMatch = location.hash.match(/^#sign=(.+)$/);
      const hashTokenMatch = location.hash.match(/^#share=([a-z0-9]+)$/i);

      if (pathMatch) {
        const id = pathMatch[1];
        setSharedId(id); setShareError(false); setShareLoading(true); setView("counterparty"); setActiveDocId(null);
        try {
          const doc = await apiGetShare(id);
          setSharedDoc(doc); setShareError(false);
        } catch (e) {
          setSharedDoc(null); setShareError(true);
        } finally {
          setShareLoading(false);
        }
        return;
      }
      if (hashSignMatch) {
        try {
          const raw = hashSignMatch[1];
          let json = null;
          if (window.LZString && window.LZString.decompressFromEncodedURIComponent) {
            json = window.LZString.decompressFromEncodedURIComponent(raw);
          }
          if (!json) { json = decodeURIComponent(escape(atob(decodeURIComponent(raw)))); }
          const decoded = JSON.parse(json);
          if (!decoded || !decoded.id) throw new Error("invalid payload");
          setSharedDoc(decoded); setSharedId(null); setShareError(false); setActiveDocId(null); setView("counterparty");
        } catch (e) {
          setSharedDoc(null); setSharedId(null); setShareError(true); setView("counterparty");
        }
        return;
      }
      if (hashTokenMatch) {
        const d = docs.find((x) => x.shareToken === hashTokenMatch[1]);
        if (d) { setSharedDoc(null); setSharedId(null); setActiveDocId(d.id); setShareError(false); setView("counterparty"); return; }
        setSharedDoc(null); setSharedId(null); setShareError(true); setView("counterparty");
        return;
      }
      if (view === "counterparty") {
        setView("library"); setActiveDocId(null); setSharedDoc(null); setSharedId(null); setShareError(false);
      }
    };
    check();
    window.addEventListener("hashchange", check);
    window.addEventListener("popstate", check);
    return () => {
      window.removeEventListener("hashchange", check);
      window.removeEventListener("popstate", check);
    };
  }, [docs]);

  // Poll for signed updates: when the sender re-opens the app or comes back to focus,
  // refresh any shared docs from the server so signed versions appear in the library.
  useEffectA(() => {
    let cancelled = false;
    const refreshShared = async () => {
      const shared = docs.filter((d) => d.shareId && d.status !== "completed");
      if (!shared.length) return;
      const updates = await Promise.all(shared.map(async (d) => {
        try {
          const remote = await apiGetShare(d.shareId);
          if (remote && remote.status === "completed" && d.status !== "completed") {
            return { ...d, ...remote, id: d.id, shareId: d.shareId };
          }
        } catch (_) {}
        return null;
      }));
      if (cancelled) return;
      const changed = updates.filter(Boolean);
      if (changed.length) {
        setDocs((prev) => prev.map((d) => {
          const upd = changed.find((u) => u.id === d.id);
          return upd || d;
        }));
        showToast(`התקבל מסמך חתום מהצד השני (${changed.length})`);
      }
    };
    refreshShared();
    const onFocus = () => refreshShared();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [docs.length]);

  const showToast = (msg) => {setToast(msg);setTimeout(() => setToast(""), 2200);};

  const openDoc = (id) => {
    setActiveDocId(id);
    setView("editor");
  };

  const newDocFromUpload = (file) => {
    const id = "doc-" + genId();
    const cleanName = (file.name || "מסמך").replace(/\.(pdf|png|jpg|jpeg|docx)$/i, "");
    const isImage = /^image\//.test(file.type);
    const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);

    const finish = (pages, kind) => {
      const newDoc = {
        id, name: cleanName || "מסמך חדש",
        template: kind,
        counterparty: "ספק / לקוח חדש",
        status: "draft",
        createdAt: Date.now(),
        uploadedPages: pages || null,
        uploadedFileName: file.name,
        uploadedMime: file.type,
        fields: []
      };
      setDocs((prev) => [newDoc, ...prev]);
      setActiveDocId(id);
      setView("editor");
      showToast("המסמך הועלה — הוסף שדות חתימה");
    };

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => finish([reader.result], "uploaded_image");
      reader.readAsDataURL(file);
    } else if (isPdf && window.pdfjsLib) {
      showToast("טוען PDF…");
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const pdf = await window.pdfjsLib.getDocument({ data: reader.result }).promise;
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const c = document.createElement("canvas");
            c.width = viewport.width; c.height = viewport.height;
            await page.render({ canvasContext: c.getContext("2d"), viewport }).promise;
            pages.push(c.toDataURL("image/jpeg", 0.85));
          }
          finish(pages, "uploaded_pdf");
        } catch (err) {
          console.error(err);
          showToast("שגיאה בטעינת ה-PDF");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      finish(null, "uploaded_file");
    }
  };

  const deleteDoc = (id) => {
    if (!confirm("למחוק את המסמך? לא ניתן לשחזר.")) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    showToast("המסמך נמחק");
  };

  // Create an independent copy of a document. Deep-clones all nested data
  // (fields, uploadedPages, quoteData/bankTransferData/salesCallData incl. their
  // nested arrays/blocks) so edits to the copy never touch the original. The
  // copy starts as a fresh unshared/unsigned draft.
  const duplicateDoc = (id) => {
    const src = docs.find((d) => d.id === id);
    if (!src) return;
    let clone;
    try {
      clone = JSON.parse(JSON.stringify(src));
    } catch (e) {
      console.error("duplicate clone failed", e);
      showToast("שגיאה בשכפול המסמך");
      return;
    }
    clone.id = "doc-" + genId();
    clone.name = "עותק · " + (src.name || "מסמך");
    clone.status = "draft";
    clone.createdAt = Date.now();
    // Strip anything tying it to the original's share/sign lifecycle.
    delete clone.shareId;
    delete clone.shareToken;
    delete clone.completedAt;
    delete clone.signedBy;
    delete clone.clientEmail;
    setDocs((prev) => [clone, ...prev]);
    showToast("נוצר עותק חדש — שינויים בו לא ישפיעו על המקור");
  };

  const newBlankDoc = () => {
    const id = "doc-" + genId();
    const newDoc = {
      id, name: "מסמך חדש",
      template: "service_agreement",
      counterparty: "צד ב'",
      status: "draft",
      createdAt: Date.now(),
      fields: []
    };
    setDocs([newDoc, ...docs]);
    setActiveDocId(id);
    setView("editor");
  };

  // Centralized signature-request flow used by all editors and the saved-sigs modal.
  // opts.defaultMode = "draw" | "type" | "upload" | "saved" (which tab opens first)
  // opts.updateMain  = whether to also overwrite the user's main mySignature on save
  const requestSignature = (after, opts) => {
    setSigAfter(() => after);
    // 'auto' lets SignaturePad pick: saved tab if there are saved sigs, else draw
    setSigDefaultMode((opts && opts.defaultMode) || "auto");
    setSigUpdateMain(opts && opts.updateMain === false ? false : true);
    setSigOpen(true);
  };

  // "צייר חתימה חדשה" inside SavedSignaturesModal: open SignaturePad in draw mode,
  // and on save push the result into the saved-signatures library (without touching mySignature).
  // The saved-sigs modal hides automatically while the signature pad is open (controlled
  // by the open prop below: savedSigsOpen && !sigOpen). After the pad closes the saved-sigs
  // modal reappears and the newly-added entry's name input is auto-focused so the user
  // can immediately type whose signature it is.
  const onSavedSigsDrawNew = () => {
    requestSignature((dataUrl) => {
      const fresh = { id: "sig-" + genId(), name: "", dataUrl, createdAt: Date.now() };
      saveSavedSignatures([fresh, ...loadSavedSignatures()]);
      setSavedSigsRefreshKey((k) => k + 1);
      setHighlightSigId(fresh.id);
      showToast("חתימה חדשה נשמרה — תן/תני לה שם");
    }, { defaultMode: "draw", updateMain: false });
  };

  const openNewQuote = () => { setQuoteFormEditingId(null); setQuoteFormOpen(true); };
  const openEditQuote = () => { if (activeDoc) { setQuoteFormEditingId(activeDoc.id); setQuoteFormOpen(true); } };
  const openNewBankTransfer = () => { setBtFormEditingId(null); setBtFormOpen(true); };
  const openEditBankTransfer = () => { if (activeDoc) { setBtFormEditingId(activeDoc.id); setBtFormOpen(true); } };
  const openNewSalesCall = () => { setScFormEditingId(null); setScFormOpen(true); };
  const openEditSalesCall = () => { if (activeDoc) { setScFormEditingId(activeDoc.id); setScFormOpen(true); } };

  // Re-open a locked doc for editing. Clears the share id (so future shares
  // generate a new link) and resets status back to draft. Existing share URLs
  // sent to clients keep working but no longer reflect new edits.
  const onUnlockDoc = () => {
    if (!activeDoc) return;
    const msg = activeDoc.status === "completed"
      ? "המסמך נחתם והושלם. לפתוח לעריכה מחדש? קישור קיים שנשלח לצד השני לא יתעדכן עם השינויים החדשים."
      : "המסמך נשלח וננעל. לפתוח לעריכה מחדש? קישור קיים שנשלח לצד השני לא יתעדכן עם השינויים החדשים. ייווצר קישור חדש בלחיצה הבאה על שליחה.";
    if (!confirm(msg)) return;
    const unlocked = { ...activeDoc, status: "draft" };
    delete unlocked.shareId;
    delete unlocked.shareToken;
    delete unlocked.completedAt;
    delete unlocked.signedBy;
    updateDoc(unlocked);
    showToast("המסמך נפתח לעריכה");
  };

  const onSalesCallFormSubmit = (data) => {
    if (scFormEditingId) {
      const target = docs.find((d) => d.id === scFormEditingId);
      if (target) {
        const updated = {
          ...target,
          salesCallData: data,
          name: `סיכום שיחה · ${data.clientName || "לקוח"}`,
          counterparty: data.clientName || "לקוח פוטנציאלי",
        };
        updateDoc(updated);
        showToast("הסיכום עודכן");
      }
    } else {
      const id = "doc-" + genId();
      const newDoc = {
        id,
        name: `סיכום שיחה · ${data.clientName || "לקוח"}`,
        template: "sales_call",
        counterparty: data.clientName || "לקוח פוטנציאלי",
        status: "draft",
        createdAt: Date.now(),
        salesCallData: data,
        fields: [],  // internal doc — no signature fields
        sender: "איי או טי סטארטפס בע״מ",
      };
      setDocs((prev) => [newDoc, ...prev]);
      setActiveDocId(id);
      setView("editor");
      showToast("הסיכום נוצר");
    }
    setScFormOpen(false);
    setScFormEditingId(null);
  };

  const onBankTransferFormSubmit = (data) => {
    if (btFormEditingId) {
      const target = docs.find((d) => d.id === btFormEditingId) || (sharedDoc && sharedDoc.id === btFormEditingId ? sharedDoc : null);
      if (target) {
        const updated = {
          ...target,
          bankTransferData: data,
          name: `העברה · ${data.beneficiaryName || data.resolutionNumber || "מוטב"}`,
          counterparty: data.beneficiaryName || "מוטב",
        };
        updateDoc(updated);
        showToast("פרטי ההחלטה עודכנו");
      }
    } else {
      const id = "doc-" + genId();
      // Try to auto-fill each signatory's signature from the saved-signatures library by matching name
      const sig1Match = findSavedSignatureByName(data.signatories && data.signatories[0] && data.signatories[0].name);
      const sig2Match = findSavedSignatureByName(data.signatories && data.signatories[1] && data.signatories[1].name);
      const fields = [
        { id: "bt-sig1-" + genId(), type: "signature", page: 0, x: 150, y: 735, w: 190, h: 60, assignee: "me", value: (sig1Match && sig1Match.dataUrl) || mySignature || null },
        { id: "bt-sig2-" + genId(), type: "signature", page: 0, x: 150, y: 855, w: 190, h: 60, assignee: "me", value: (sig2Match && sig2Match.dataUrl) || null },
        // ONE company stamp — placed between the two signatories on the left side
        { id: "bt-stamp-" + genId(), type: "stamp", page: 0, x: 460, y: 790, w: 90, h: 90, assignee: "me", value: "stamp" },
      ];
      const newDoc = {
        id,
        name: `העברה · ${data.beneficiaryName || data.resolutionNumber || "מוטב"}`,
        template: "bank_transfer",
        counterparty: data.beneficiaryName || "מוטב",
        status: "draft",
        createdAt: Date.now(),
        bankTransferData: data,
        fields,
        sender: "איי או טי סטארטפס בע״מ",
      };
      setDocs((prev) => [newDoc, ...prev]);
      setActiveDocId(id);
      setView("editor");
      showToast("ההחלטה נוצרה — שדות חתימה הוצבו אוטומטית");
    }
    setBtFormOpen(false);
    setBtFormEditingId(null);
  };

  const onQuoteFormSubmit = (quoteData) => {
    if (quoteFormEditingId) {
      // Edit existing quote
      const target = docs.find((d) => d.id === quoteFormEditingId) || (sharedDoc && sharedDoc.id === quoteFormEditingId ? sharedDoc : null);
      if (target) {
        const updated = { ...target, quoteData, name: `הצעת מחיר · ${quoteData.clientName}`, counterparty: quoteData.clientName };
        updateDoc(updated);
        showToast("פרטי ההצעה עודכנו");
      }
    } else {
      // Create new quote with pre-placed signature fields on page 2
      const id = "doc-" + genId();
      const fields = [
        { id: "qf-me-sig-" + genId(), type: "signature", page: 1, x: 80, y: 612, w: 200, h: 56, assignee: "me", value: mySignature || null },
        { id: "qf-me-stamp-" + genId(), type: "stamp", page: 1, x: 285, y: 590, w: 80, h: 80, assignee: "me", value: "stamp" },
        { id: "qf-them-sig-" + genId(), type: "signature", page: 1, x: 510, y: 612, w: 200, h: 56, assignee: "them", value: null },
        { id: "qf-them-name-" + genId(), type: "text", page: 1, x: 510, y: 678, w: 200, h: 24, assignee: "them", value: null },
        { id: "qf-them-date-" + genId(), type: "date", page: 1, x: 510, y: 706, w: 200, h: 24, assignee: "them", value: null },
      ];
      const newDoc = {
        id,
        name: `הצעת מחיר · ${quoteData.clientName}`,
        template: "flowbiz_quote",
        counterparty: quoteData.clientName,
        status: "draft",
        createdAt: Date.now(),
        quoteData,
        fields,
        sender: "איי או טי סטארטפס בע״מ",
      };
      setDocs((prev) => [newDoc, ...prev]);
      setActiveDocId(id);
      setView("editor");
      showToast("הצעת המחיר נוצרה — שדות חתימה הוצבו אוטומטית");
    }
    setQuoteFormOpen(false);
    setQuoteFormEditingId(null);
  };

  const updateDoc = (next) => {
    if (sharedDoc && next.id === sharedDoc.id) {
      setSharedDoc(next);
      return;
    }
    setDocs(docs.map((d) => d.id === next.id ? next : d));
  };

  const activeDoc = sharedDoc || docs.find((d) => d.id === activeDocId);

  const openShare = () => {
    if (!activeDoc) return;
    setShareOpen(true);
  };

  const onShareReady = (shareId) => {
    if (!activeDoc) return;
    updateDoc({ ...activeDoc, shareId, status: activeDoc.status === "draft" ? "sent" : activeDoc.status });
  };

  const downloadDoc = async (d) => {
    if (!d) return;
    showToast("מכין הורדה...");
    const PW = 794, PH = 1123;
    if (typeof window.html2canvas !== "function") {
      showToast("שגיאה — html2canvas לא נטען");
      return;
    }
    try {
      const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      const pdf = new jsPDFCtor({ unit: "px", format: [PW, PH], hotfixes: ["px_scaling"] });

      // Capture each page directly from the DOM — this includes the template's
      // HTML content (text, tables, images) plus any overlaid signature/stamp/
      // date/text fields, so the PDF matches what the user sees on screen.
      const pageEls = Array.from(document.querySelectorAll('[data-page-idx]'));

      if (pageEls.length === 0) {
        showToast("יש לפתוח את המסמך לפני הורדה");
        return;
      }

      // Sort by page index so we add them to the PDF in order.
      pageEls.sort((a, b) => Number(a.dataset.pageIdx || 0) - Number(b.dataset.pageIdx || 0));

      // Track whether we've added the first page yet so we can call addPage()
      // correctly when content spans multiple slices/pages.
      let firstPageAdded = false;
      const SCALE = 2;                       // canvas oversampling
      const CANVAS_PAGE_HEIGHT = PH * SCALE; // how tall one A4 page is in canvas pixels

      for (let pi = 0; pi < pageEls.length; pi++) {
        const original = pageEls[pi];
        // Clone off-screen at natural A4 size — avoids messing with the visible
        // editor (no flicker, no layout shift) and forces 1:1 capture.
        const clone = original.cloneNode(true);
        clone.style.transform = "none";
        clone.style.zoom = "1";
        clone.style.position = "absolute";
        clone.style.top = "0";
        clone.style.left = "0";
        clone.style.width = `${PW}px`;
        clone.style.minHeight = `${PH}px`;
        clone.style.height = "auto";
        clone.style.boxShadow = "none";
        clone.style.borderRadius = "0";
        // Remove edit-only affordances from the clone before capturing.
        clone.querySelectorAll(".field-tools, .field-resize, .field-tag").forEach((el) => el.remove());
        clone.querySelectorAll(".field.placeholder:not(.filled)").forEach((el) => {
          el.style.border = "none";
          el.style.background = "transparent";
        });
        clone.querySelectorAll(".field-label").forEach((el) => { el.style.display = "none"; });

        const wrap = document.createElement("div");
        wrap.style.position = "fixed";
        wrap.style.top = "-99999px";
        wrap.style.left = "0";
        wrap.style.zIndex = "-1";
        wrap.style.background = "#fff";
        wrap.appendChild(clone);
        document.body.appendChild(wrap);

        try {
          const totalH = Math.max(PH, clone.scrollHeight);
          const canvas = await window.html2canvas(clone, {
            scale: SCALE,
            backgroundColor: "#fff",
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: PW,
            height: totalH,
            windowWidth: PW,
            windowHeight: totalH,
          });
          // Slice the captured canvas into A4-tall pages. The previous version
          // forced the whole tall capture into one PDF page, which squished
          // content vertically when the content was longer than one A4.
          const sliceCount = Math.max(1, Math.ceil(canvas.height / CANVAS_PAGE_HEIGHT));
          for (let s = 0; s < sliceCount; s++) {
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = CANVAS_PAGE_HEIGHT;
            const sctx = sliceCanvas.getContext("2d");
            sctx.fillStyle = "#fff";
            sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            const srcY = s * CANVAS_PAGE_HEIGHT;
            const sliceSrcH = Math.min(CANVAS_PAGE_HEIGHT, canvas.height - srcY);
            sctx.drawImage(
              canvas,
              0, srcY, canvas.width, sliceSrcH,
              0, 0, canvas.width, sliceSrcH
            );
            const dataUrl = sliceCanvas.toDataURL("image/jpeg", 0.92);
            if (firstPageAdded) pdf.addPage([PW, PH]);
            pdf.addImage(dataUrl, "JPEG", 0, 0, PW, PH);
            firstPageAdded = true;
          }
        } finally {
          document.body.removeChild(wrap);
        }
      }

      pdf.save((d.name || "מסמך") + ".pdf");
      showToast("המסמך הורד");
    } catch (e) {
      console.error("PDF download failed", e);
      showToast("שגיאה בהורדה");
    }
  };

  // Build the auto date/time footer field stamped on completion
  const buildCompletionStampField = (doc, signerName) => {
    const lastPage = doc.uploadedPages ? doc.uploadedPages.length - 1 : 0;
    const ts = new Date();
    const human = ts.toLocaleString("he-IL", { dateStyle: "long", timeStyle: "short" });
    return {
      id: "sysstamp-" + genId(),
      type: "text",
      page: lastPage,
      x: 56, y: 1078, w: 682, h: 22,
      assignee: "system",
      value: `נחתם דיגיטלית ע״י ${signerName} · ${human} · FlowBiz Sign`,
    };
  };

  const onCounterpartyComplete = async () => {
    if (!activeDoc) return;
    const signerName = DOC_TEMPLATES[activeDoc.template]?.counterparty || activeDoc.counterparty || "הצד השני";
    const stampField = buildCompletionStampField(activeDoc, signerName);
    const completed = {
      ...activeDoc,
      fields: [...activeDoc.fields, stampField],
      status: "completed",
      completedAt: Date.now(),
      signedBy: signerName,
    };
    updateDoc(completed);
    // Push the signed copy back so the sender sees it in their library on next refresh
    if (sharedId) {
      try { await apiUpdateShare(sharedId, completed); }
      catch (e) { console.error("failed to push signed copy", e); showToast("נשמר מקומית — נכשלה השליחה לשרת"); }
    }
    showToast("המסמך נחתם — מורד אליך עותק חתום");
    return completed;
  };

  // Block the admin app behind a login screen. Client-route URLs (/s/<id>) bypass.
  if (requiresAuth && !adminAuth) {
    return <LoginModal open={true} onLogin={(auth) => { saveAdminAuth(auth); setAdminAuth(auth); }} />;
  }

  return (
    <>
      {view === "library" &&
      <Library
        docs={docs}
        onOpen={openDoc}
        onDuplicate={duplicateDoc}
        onUpload={newDocFromUpload}
        onNew={newBlankDoc}
        onNewQuote={openNewQuote}
        onNewBankTransfer={openNewBankTransfer}
        onNewSalesCall={openNewSalesCall}
        onOpenSavedSigs={() => setSavedSigsOpen(true)}
        onDelete={deleteDoc}
        adminEmail={adminAuth && adminAuth.email}
        onLogout={() => { clearAdminAuth(); setAdminAuth(null); }}
      />
      }

      {view === "editor" && activeDoc &&
      (() => {
        const ownerLocked = !!activeDoc.shareId || activeDoc.status === "completed";
        return (
        <>
          <div className="topbar">
            <div className="brand">
              <img src="assets/logo.png" alt="FlowBiz" />
              <div>
                <div className="brand-title">
                  {activeDoc.name}
                  {ownerLocked && (
                    <span className="pill pill-ok" style={{ marginInlineStart: 8 }}>
                      <Icon name={activeDoc.status === "completed" ? "check-circle" : "shield-check"} size={11} />
                      {activeDoc.status === "completed" ? "חתום ונעול" : "נשלח — נעול"}
                    </span>
                  )}
                </div>
                <div className="brand-sub">{DOC_TEMPLATES[activeDoc.template]?.counterparty || activeDoc.counterparty}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadDoc(activeDoc)}>
                <Icon name="download" size={14} /> הורדה
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setView("library"); setActiveDocId(null); }}>
                <Icon name="arrow-right" size={14} /> חזרה
              </button>
            </div>
          </div>
          <Editor
            doc={activeDoc}
            onUpdate={updateDoc}
            onBack={() => { setView("library"); setActiveDocId(null); }}
            onOpenShare={openShare}
            onEditQuote={activeDoc.template === "flowbiz_quote" && !ownerLocked ? openEditQuote : null}
            onEditBankTransfer={activeDoc.template === "bank_transfer" && !ownerLocked ? openEditBankTransfer : null}
            onEditSalesCall={activeDoc.template === "sales_call" && !ownerLocked ? openEditSalesCall : null}
            onUnlock={ownerLocked ? onUnlockDoc : null}
            mySignature={mySignature}
            onNeedSignature={(after, opts) => requestSignature(after, opts)}
            viewMode={ownerLocked ? "readonly" : "owner"}
            locked={ownerLocked}
          />
        </>
        );
      })()
      }

      {view === "counterparty" && shareLoading &&
        <div className="cv-error-screen">
          <div className="cv-error-card">
            <div className="cv-error-icon" style={{ background: "var(--blue-500)" }}><Icon name="file-text" size={32} color="#fff" /></div>
            <h2>טוען את המסמך…</h2>
            <p>רגע אחד, מקבל את המסמך מהשרת.</p>
          </div>
        </div>
      }

      {view === "counterparty" && !shareLoading && shareError &&
        <div className="cv-error-screen">
          <div className="cv-error-card">
            <div className="cv-error-icon"><Icon name="info" size={36} color="#fff" /></div>
            <h2>הקישור אינו תקין או פג תוקפו</h2>
            <p>נראה שהקישור פגום, חלקי, או שהמסמך כבר אינו זמין. בקש/י קישור חדש מהשולח.</p>
          </div>
        </div>
      }

      {view === "counterparty" && !shareLoading && !shareError && activeDoc &&
      <>
          <ClientView
            doc={activeDoc}
            onUpdate={updateDoc}
            mySignature={mySignature}
            onNeedSignature={(after, opts) => requestSignature(after, opts)}
            onComplete={async () => {
              const completed = await onCounterpartyComplete();
              if (completed) downloadDoc(completed);
            }}
            downloadDoc={downloadDoc}
          />
        </>
      }

      <SignaturePad
        open={sigOpen}
        onClose={() => { setSigOpen(false); setSigAfter(null); }}
        onSave={(dataUrl) => {
          if (sigUpdateMain) setMySignature(dataUrl);
          if (sigAfter) sigAfter(dataUrl);
          setSigAfter(null);
        }}
        defaultName={view === "counterparty" ? "" : "דני"}
        defaultMode={sigDefaultMode}
        savedSignatures={loadSavedSignatures()} />
      

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        doc={activeDoc}
        onShareReady={onShareReady}
        defaultClientEmail={(typeof localStorage !== "undefined" && localStorage.getItem("flowbiz-last-client-email")) || ""}
        onMarkSent={() => {
          showToast("הקישור נשלח — חוזרים לספריית המסמכים");
          setShareOpen(false);
          setView("library");
          setActiveDocId(null);
          setSharedDoc(null);
          setSharedId(null);
        }}
      />
      

      <QuoteFormModal
        open={quoteFormOpen}
        onClose={() => { setQuoteFormOpen(false); setQuoteFormEditingId(null); }}
        onSubmit={onQuoteFormSubmit}
        initial={quoteFormEditingId ? (docs.find((d) => d.id === quoteFormEditingId)?.quoteData || null) : null}
      />

      <BankTransferFormModal
        open={btFormOpen}
        onClose={() => { setBtFormOpen(false); setBtFormEditingId(null); }}
        onSubmit={onBankTransferFormSubmit}
        initial={btFormEditingId ? (docs.find((d) => d.id === btFormEditingId)?.bankTransferData || null) : null}
        suggestedResolutionNumber={nextResolutionNumber(docs)}
        onOpenSavedSigs={() => setSavedSigsOpen(true)}
        onVendorsChanged={() => setVendorBump((v) => v + 1)}
      />

      <SalesCallFormModal
        open={scFormOpen}
        onClose={() => { setScFormOpen(false); setScFormEditingId(null); }}
        onSubmit={onSalesCallFormSubmit}
        initial={scFormEditingId ? (docs.find((d) => d.id === scFormEditingId)?.salesCallData || null) : null}
      />

      <SavedSignaturesModal
        open={savedSigsOpen && !sigOpen}
        onClose={() => { setSavedSigsOpen(false); setHighlightSigId(null); }}
        refreshKey={savedSigsRefreshKey}
        onDrawNew={onSavedSigsDrawNew}
        highlightId={highlightSigId}
      />

      <Toast message={toast} />
    </>);

};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
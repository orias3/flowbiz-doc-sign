// Main app — library + editor + share modal + counterparty view

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

// LocalStorage helpers — fake backend
const STORAGE_KEY = "flowbiz-sign-docs-v1";
const SIG_KEY = "flowbiz-sign-mysig-v1";
const SHARED_KEY = "flowbiz-sign-shared-v1"; // map shareToken -> docId

function loadDocs() {
  try {return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;} catch {return null;}
}
function saveDocs(docs) {
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));} catch {}
}
function loadSig() {try {return localStorage.getItem(SIG_KEY);} catch {return null;}}
function saveSig(s) {try {localStorage.setItem(SIG_KEY, s);} catch {}}

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

const Library = ({ docs, onOpen, onUpload, onNew, onDelete }) => {
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-secondary btn-sm">
            <Icon name="user" size={14} /> איי או טי סטארטפס בע״מ
          </button>
        </div>
      </div>

      <div className="library">
        <div className="library-head">
          <div>
            <h1>המסמכים שלי</h1>
            <p className="sub">העלה מסמך, סמן איפה לחתום ולהחתים, וקבל קישור לשליחה.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => fileRef.current && fileRef.current.click()}>
            <Icon name="plus" size={16} /> מסמך חדש
          </button>
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
                <button className="doc-card-del" title="מחיקה" onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}>
                  <Icon name="trash" size={14} />
                </button>
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

const App = () => {
  const [docs, setDocs] = useStateA(() => loadDocs() || DEFAULT_DOCS);
  const [mySignature, setMySignature] = useStateA(() => loadSig());
  const [view, setView] = useStateA("library"); // library | editor | counterparty
  const [activeDocId, setActiveDocId] = useStateA(null);
  const [sigOpen, setSigOpen] = useStateA(false);
  const [sigAfter, setSigAfter] = useStateA(null);
  const [shareOpen, setShareOpen] = useStateA(false);
  const [toast, setToast] = useStateA("");
  const [sharedDoc, setSharedDoc] = useStateA(null);   // doc fetched from API (client view)
  const [sharedId, setSharedId] = useStateA(null);     // share id of the doc currently open in client view
  const [shareError, setShareError] = useStateA(false);
  const [shareLoading, setShareLoading] = useStateA(false);

  useEffectA(() => {saveDocs(docs);}, [docs]);
  useEffectA(() => {if (mySignature) saveSig(mySignature);}, [mySignature]);

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
      const shared = docs.filter((d) => d.shareId);
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
    const interval = setInterval(refreshShared, 30000);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); clearInterval(interval); };
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
    const loadImg = (src) => new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = "anonymous";
      i.onload = () => res(i); i.onerror = rej; i.src = src;
    });
    try {
      const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      const pdf = new jsPDFCtor({ unit: "px", format: [PW, PH], hotfixes: ["px_scaling"] });
      const pageCount = d.uploadedPages ? d.uploadedPages.length : 1;
      const stampImg = await loadImg("assets/stamp.png").catch(() => null);

      for (let pi = 0; pi < pageCount; pi++) {
        const c = document.createElement("canvas");
        c.width = PW * 2; c.height = PH * 2;
        const ctx = c.getContext("2d");
        ctx.scale(2, 2);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, PW, PH);
        if (d.uploadedPages && d.uploadedPages[pi]) {
          const img = await loadImg(d.uploadedPages[pi]);
          // Fit width
          const ratio = img.height / img.width;
          ctx.drawImage(img, 0, 0, PW, PW * ratio);
        }
        // Fields
        const fields = d.fields.filter((f) => f.page === pi);
        for (const f of fields) {
          if (!f.value) continue;
          if (f.type === "signature") {
            const im = await loadImg(f.value).catch(() => null);
            if (im) ctx.drawImage(im, f.x, f.y, f.w, f.h);
          } else if (f.type === "stamp") {
            // Custom uploaded stamp (data URL) takes priority over the default
            if (typeof f.value === "string" && f.value.startsWith("data:")) {
              const im = await loadImg(f.value).catch(() => null);
              if (im) ctx.drawImage(im, f.x, f.y, f.w, f.h);
            } else if (stampImg) {
              ctx.drawImage(stampImg, f.x, f.y, f.w, f.h);
            }
          } else if (f.type === "date" || f.type === "text") {
            const isSystem = f.assignee === "system";
            ctx.fillStyle = isSystem ? "#6B7687" : "#0E2A5C";
            ctx.font = (isSystem ? "italic 11px" : "bold 16px") + " Heebo, sans-serif";
            ctx.textBaseline = "middle";
            ctx.direction = "rtl";
            ctx.textAlign = isSystem ? "center" : "right";
            const tx = isSystem ? f.x + f.w / 2 : f.x + f.w - 6;
            ctx.fillText(f.value, tx, f.y + f.h / 2);
          }
        }
        if (pi > 0) pdf.addPage([PW, PH]);
        pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, PW, PH);
      }
      pdf.save((d.name || "מסמך") + ".pdf");
      showToast("המסמך הורד");
    } catch (e) {
      console.error(e);
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

  return (
    <>
      {view === "library" &&
      <Library docs={docs} onOpen={openDoc} onUpload={newDocFromUpload} onNew={newBlankDoc} onDelete={deleteDoc} />
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
            mySignature={mySignature}
            onNeedSignature={(after) => { setSigAfter(() => after); setSigOpen(true); }}
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
            onNeedSignature={(after) => { setSigAfter(() => after); setSigOpen(true); }}
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
        onClose={() => {setSigOpen(false);setSigAfter(null);}}
        onSave={(dataUrl) => {
          setMySignature(dataUrl);
          if (sigAfter) sigAfter(dataUrl);
          setSigAfter(null);
        }}
        defaultName={view === "counterparty" ? "" : "דני"} />
      

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
      

      <Toast message={toast} />
    </>);

};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
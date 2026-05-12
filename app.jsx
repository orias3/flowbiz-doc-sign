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
  if (doc.shareToken) {
    if (them.length && them.every((f) => f.value)) return "completed";
    return "sent";
  }
  return "draft";
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

function buildSignUrl(doc) {
  const payload = {
    id: doc.id, name: doc.name, template: doc.template,
    counterparty: doc.counterparty,
    uploadedPages: doc.uploadedPages || null,
    uploadedFileName: doc.uploadedFileName || null,
    fields: doc.fields || [],
    sender: "איי או טי סטארטפס בע״מ",
  };
  const json = JSON.stringify(payload);
  const compressed = (window.LZString && window.LZString.compressToEncodedURIComponent)
    ? window.LZString.compressToEncodedURIComponent(json)
    : encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  return `${location.origin}${location.pathname}#sign=${compressed}`;
}

const ShareModal = ({ open, onClose, doc, onMarkSent }) => {
  const [copied, setCopied] = useStateA(false);
  if (!doc) return null;
  const url = buildSignUrl(doc);
  const tooLong = url.length > 7500;

  const copy = () => {
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
        <button className="channel-btn" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("שלום, מצורף קישור לחתימה על המסמך: " + url)}`)}>
          <div className="channel-icon" style={{ background: "#25D366" }}><Icon name="whatsapp" size={22} color="#fff" /></div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>WhatsApp</div>
        </button>
        <button className="channel-btn" onClick={() => window.open(`mailto:?subject=${encodeURIComponent("מסמך לחתימה: " + doc.name)}&body=${encodeURIComponent("שלום,\n\nמצורף קישור לחתימה על המסמך:\n" + url + "\n\nתודה!")}`)}>
          <div className="channel-icon" style={{ background: "var(--blue-500)" }}><Icon name="mail" size={20} color="#fff" /></div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>אימייל</div>
        </button>
        <button className="channel-btn" onClick={copy}>
          <div className="channel-icon" style={{ background: "var(--gray-700)" }}><Icon name="link" size={18} color="#fff" /></div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>העתק קישור</div>
        </button>
      </div>

      <div style={{ marginTop: 22, background: tooLong ? "var(--orange-50)" : "var(--blue-50)", border: "1px solid " + (tooLong ? "var(--orange-100)" : "var(--blue-100)"), borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon name={tooLong ? "info" : "shield-check"} size={18} color={tooLong ? "var(--orange-600)" : "var(--blue-600)"} />
        <div style={{ fontSize: 12.5, color: tooLong ? "var(--orange-600)" : "var(--blue-800)", lineHeight: 1.55 }}>
          {tooLong
            ? "המסמך גדול — ייתכן שהקישור יהיה ארוך מדי לחלק מהמערכות (WhatsApp/SMS). מומלץ לשלוח באימייל או להעתיק ידנית."
            : "המסמך נטמע ישירות בקישור — הצד השני יראה אך ורק את החלון לחתימה, ללא גישה לממשק שלך. אחרי שיחתום, תקבל את העותק החתום חזרה."}
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-primary" onClick={() => {onMarkSent && onMarkSent();onClose();}}>
          <Icon name="send" size={16} /> סיימתי — חזרה למסמכים
        </button>
        <button className="btn btn-ghost" onClick={onClose}>סגירה</button>
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
  const [sharedDoc, setSharedDoc] = useStateA(null); // doc decoded from URL (cross-device)
  const [shareError, setShareError] = useStateA(false);

  useEffectA(() => {saveDocs(docs);}, [docs]);
  useEffectA(() => {if (mySignature) saveSig(mySignature);}, [mySignature]);

  // URL routing for share links — hard-locked: never falls back to library while a share hash is present
  useEffectA(() => {
    const check = () => {
      const signMatch = location.hash.match(/^#sign=(.+)$/);
      if (signMatch) {
        try {
          const raw = signMatch[1];
          let json = null;
          if (window.LZString && window.LZString.decompressFromEncodedURIComponent) {
            json = window.LZString.decompressFromEncodedURIComponent(raw);
          }
          if (!json) { json = decodeURIComponent(escape(atob(decodeURIComponent(raw)))); }
          const decoded = JSON.parse(json);
          if (!decoded || !decoded.id) throw new Error("invalid payload");
          setSharedDoc(decoded);
          setShareError(false);
          setActiveDocId(null);
          setView("counterparty");
        } catch (e) {
          console.error("share decode failed", e);
          setSharedDoc(null);
          setShareError(true);
          setView("counterparty");
        }
        return;
      }
      const tokenMatch = location.hash.match(/^#share=([a-z0-9]+)$/i);
      if (tokenMatch) {
        const d = docs.find((x) => x.shareToken === tokenMatch[1]);
        if (d) { setSharedDoc(null); setActiveDocId(d.id); setShareError(false); setView("counterparty"); return; }
        // Token unknown on this device → lock to error, never show library
        setSharedDoc(null); setShareError(true); setView("counterparty");
        return;
      }
      if (view === "counterparty") { setView("library"); setActiveDocId(null); setSharedDoc(null); setShareError(false); }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [docs]);

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
    if (!activeDoc.shareToken) {
      const token = genId();
      updateDoc({ ...activeDoc, shareToken: token });
    }
    setShareOpen(true);
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
          } else if (f.type === "stamp" && stampImg) {
            ctx.drawImage(stampImg, f.x, f.y, f.w, f.h);
          } else if (f.type === "date" || f.type === "text") {
            ctx.fillStyle = "#0E2A5C";
            ctx.font = "bold 16px Heebo, sans-serif";
            ctx.textBaseline = "middle";
            ctx.direction = "rtl";
            ctx.textAlign = "right";
            ctx.fillText(f.value, f.x + f.w - 6, f.y + f.h / 2);
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

  const onCounterpartyComplete = () => {
    if (!activeDoc) return;
    updateDoc({ ...activeDoc, status: "completed", completedAt: Date.now() });
    showToast("המסמך נחתם והוחזר. תודה!");
  };

  return (
    <>
      {view === "library" &&
      <Library docs={docs} onOpen={openDoc} onUpload={newDocFromUpload} onNew={newBlankDoc} onDelete={deleteDoc} />
      }

      {view === "editor" && activeDoc &&
      <>
          <div className="topbar">
            <div className="brand">
              <img src="assets/logo.png" alt="FlowBiz" />
              <div>
                <div className="brand-title">{activeDoc.name}</div>
                <div className="brand-sub">{DOC_TEMPLATES[activeDoc.template]?.counterparty}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadDoc(activeDoc)}>
                <Icon name="download" size={14} /> הורדה
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => {setView("library");setActiveDocId(null);}}>
                <Icon name="arrow-right" size={14} /> חזרה
              </button>
            </div>
          </div>
          <Editor
          doc={activeDoc}
          onUpdate={updateDoc}
          onBack={() => {setView("library");setActiveDocId(null);}}
          onOpenShare={openShare}
          mySignature={mySignature}
          onNeedSignature={(after) => {setSigAfter(() => after);setSigOpen(true);}}
          viewMode="owner" />
        
        </>
      }

      {view === "counterparty" && shareError &&
        <div className="cv-error-screen">
          <div className="cv-error-card">
            <div className="cv-error-icon"><Icon name="info" size={36} color="#fff" /></div>
            <h2>הקישור אינו תקין או פג תוקפו</h2>
            <p>נראה שהקישור פגום, חלקי, או שהמסמך כבר אינו זמין. בקש/י קישור חדש מהשולח.</p>
          </div>
        </div>
      }

      {view === "counterparty" && !shareError && activeDoc &&
      <>
          <ClientView
            doc={activeDoc}
            onUpdate={updateDoc}
            mySignature={mySignature}
            onNeedSignature={(after) => { setSigAfter(() => after); setSigOpen(true); }}
            onComplete={() => {
              const completed = { ...activeDoc, status: "completed", completedAt: Date.now() };
              updateDoc(completed);
              downloadDoc(completed);
              showToast("המסמך נחתם — מורד אליך עותק חתום");
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
        onMarkSent={() => showToast("הקישור מוכן — אפשר לשלוח לצד השני")} />
      

      <Toast message={toast} />
    </>);

};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
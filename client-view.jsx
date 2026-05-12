// Client signing view — restricted, read-only document with sign-only fields.
// No editor sidebars, no tools, no upload, no share/download. The client can
// only: view the document comfortably, fill the fields the sender assigned to
// them, and send it back.

const { useState: useStateC, useEffect: useEffectC, useRef: useRefC, useMemo: useMemoC } = React;

const ClientView = ({ doc, onUpdate, mySignature, onNeedSignature, onComplete, downloadDoc }) => {
  const template = window.DOC_TEMPLATES[doc.template];
  const senderName = doc.sender || "איי או טי סטארטפס בע״מ";
  const counterpartyName = template?.counterparty || doc.counterparty || "אורח/ת";

  const stageRef = useRefC(null);
  const [zoom, setZoom] = useStateC(1);
  const [showSummary, setShowSummary] = useStateC(false);
  const [showDone, setShowDone] = useStateC(false);

  // Fit-to-width
  useEffectC(() => {
    const fit = () => {
      const el = stageRef.current;
      if (!el) return;
      const avail = el.clientWidth - 32;
      const z = Math.max(0.3, Math.min(1.2, avail / 794));
      setZoom(z);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const theirFields = doc.fields.filter((f) => f.assignee === "them");
  const filledCount = theirFields.filter((f) => f.value).length;
  const allDone = theirFields.length > 0 && filledCount === theirFields.length;
  const nothingToDo = theirFields.length === 0;

  const updateField = (id, patch) => {
    onUpdate({
      ...doc,
      fields: doc.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const fillField = (field, sigOverride) => {
    if (field.assignee !== "them") return;
    if (field.type === "signature") {
      const sig = sigOverride || mySignature;
      if (!sig) {
        onNeedSignature((newSig) => fillField(field, newSig));
        return;
      }
      updateField(field.id, { value: sig });
    } else if (field.type === "date") {
      updateField(field.id, { value: window.formatDate() });
    } else if (field.type === "text") {
      const v = prompt("הקלד/י את הטקסט:", field.value || "");
      if (v != null && v.trim()) updateField(field.id, { value: v });
    } else if (field.type === "stamp") {
      // Counterparty stamps are rare; allow re-use of sender stamp if intended.
      updateField(field.id, { value: "stamp" });
    }
  };

  const scrollToNext = () => {
    const next = theirFields.find((f) => !f.value);
    if (!next) return;
    const pageEl = stageRef.current?.querySelector(`[data-page-idx="${next.page}"]`);
    if (pageEl) {
      const fieldEl = pageEl.querySelector(`[data-field-id="${next.id}"]`);
      (fieldEl || pageEl).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const pages = doc.uploadedPages ? doc.uploadedPages.length : (template ? template.pages : 1);

  const renderField = (field) => {
    const filled = !!field.value;
    const mine = field.assignee === "them"; // for the client, "them" means the client themselves
    const interactive = mine && !filled;
    return (
      <div
        key={field.id}
        data-field-id={field.id}
        className={
          "cv-field " +
          (filled ? "cv-field-filled " : "cv-field-empty ") +
          (mine ? "cv-field-mine " : "cv-field-locked ") +
          (interactive ? "cv-field-pulse" : "")
        }
        style={{ left: field.x, top: field.y, width: field.w, height: field.h }}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) fillField(field);
        }}
      >
        {interactive && (
          <span className="cv-field-cta">
            <Icon name={field.type === "signature" ? "pen-tool" : field.type === "date" ? "calendar" : field.type === "stamp" ? "stamp" : "type"} size={13} />
            {field.type === "signature" ? "לחתימה" : field.type === "date" ? "הוספת תאריך" : field.type === "stamp" ? "הוספת חותמת" : "הזנת טקסט"}
          </span>
        )}
        {filled && field.type === "signature" && (
          <div className="field-signature"><img src={field.value} alt="signature" /></div>
        )}
        {filled && field.type === "stamp" && (
          <div className="field-stamp"><img src="assets/stamp.png" alt="stamp" /></div>
        )}
        {filled && (field.type === "date" || field.type === "text") && (
          <div className={"field-text " + (field.type === "date" ? "field-date" : "")}>{field.value}</div>
        )}
      </div>
    );
  };

  return (
    <div className="client-view">
      <div className="cv-topbar">
        <div className="brand">
          <img src="assets/logo.png" alt="FlowBiz" onError={(e) => (e.target.style.display = "none")} />
          <div>
            <div className="brand-title">חתימה על מסמך</div>
            <div className="brand-sub">FlowBiz Sign · ערוץ מאובטח</div>
          </div>
        </div>
        <div className="cv-top-right">
          <span className="pill pill-info" title="חיבור מוצפן"><Icon name="shield-check" size={12} /> מאובטח</span>
        </div>
      </div>

      <div className="cv-hero">
        <div className="cv-hero-inner">
          <div className="cv-hero-left">
            <div className="cv-hero-from">
              <Icon name="send" size={13} /> נשלח אליך מאת <strong>{senderName}</strong>
            </div>
            <h1>{doc.name}</h1>
            <p>שלום {counterpartyName}, עברו על המסמך. סמני/סמנו את השדות המסומנים בכתום כדי להשלים את החתימה ולשלוח חזרה.</p>
            {!nothingToDo && (
              <div className="cv-progress">
                <div className="bar"><div className="fill" style={{ width: `${(filledCount / theirFields.length) * 100}%` }} /></div>
                <span>{filledCount} מתוך {theirFields.length} שדות הושלמו</span>
              </div>
            )}
          </div>
          <div className="cv-hero-actions">
            {!nothingToDo && filledCount < theirFields.length && (
              <button className="btn btn-soft btn-sm" onClick={scrollToNext}>
                <Icon name="arrow-left" size={14} /> השדה הבא
              </button>
            )}
            <button
              className="btn btn-success"
              disabled={!allDone && !nothingToDo}
              onClick={() => setShowSummary(true)}
              title={!allDone && !nothingToDo ? "יש להשלים את כל השדות לפני שליחה" : ""}
            >
              <Icon name="check" size={16} />
              {nothingToDo ? "אישור וקבלת המסמך" : "סיום ושליחה חזרה"}
            </button>
          </div>
        </div>
      </div>

      <div className="cv-stage" ref={stageRef}>
        <div className="zoom-bar cv-zoom-bar">
          <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} title="הקטנה"><Icon name="zoom-out" size={14} /></button>
          <span className="zoom-val">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} title="הגדלה"><Icon name="zoom-in" size={14} /></button>
          <button className="zoom-btn" onClick={() => {
            const el = stageRef.current; if (!el) return;
            setZoom(Math.max(0.4, Math.min(1.2, (el.clientWidth - 32) / 794)));
          }} title="התאם לרוחב"><Icon name="maximize" size={14} /></button>
        </div>

        <div className="cv-stage-inner">
          {Array.from({ length: pages }).map((_, pi) => (
            <div key={pi} className="page cv-page" data-page-idx={pi} style={{ zoom: zoom }}>
              {doc.uploadedPages
                ? <img src={doc.uploadedPages[pi]} className="page-uploaded" alt="" />
                : (template ? template.render(pi) : <div className="page-content"><p>תוכן מסמך</p></div>)
              }
              <div className="page-watermark">עמוד {pi + 1} מתוך {pages} · נחתם דרך FlowBiz Sign</div>
              {doc.fields.filter((f) => f.page === pi).map(renderField)}
            </div>
          ))}
        </div>
      </div>

      {!allDone && !nothingToDo && filledCount < theirFields.length && (
        <button className="cv-floating-next" onClick={scrollToNext} title="קפיצה לשדה הבא">
          <Icon name="pen-tool" size={16} />
          השדה הבא ({filledCount + 1}/{theirFields.length})
        </button>
      )}

      <Modal open={showSummary} onClose={() => setShowSummary(false)} title="לאשר ולשלוח חזרה?" subtitle={`המסמך החתום יורד אליך כקובץ PDF. אפשר לשלוח אותו חזרה ל-${senderName} ב-WhatsApp או באימייל.`}>
        <div className="cv-summary">
          <div className="cv-summary-row"><Icon name="file-text" size={16} color="var(--blue-600)" /> {doc.name}</div>
          <div className="cv-summary-row"><Icon name="user-check" size={16} color="var(--green-600)" /> {filledCount} שדות מולאו על ידך</div>
          <div className="cv-summary-row"><Icon name="shield-check" size={16} color="var(--blue-600)" /> חתימה מאובטחת וחתומה דיגיטלית</div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-success" onClick={() => { setShowSummary(false); onComplete && onComplete(); setShowDone(true); }}>
            <Icon name="check" size={16} /> אישור והורדה
          </button>
          <button className="btn btn-ghost" onClick={() => setShowSummary(false)}>חזרה</button>
        </div>
      </Modal>

      <Modal open={showDone} onClose={() => setShowDone(false)} title="המסמך נחתם!" subtitle={`קובץ PDF חתום ירד אליך. כדי לסגור את התהליך, שלח/י אותו חזרה אל ${senderName}.`}>
        <div className="completion" style={{ padding: "8px 0 18px" }}>
          <div className="completion-circle"><Icon name="check" size={36} color="#fff" /></div>
        </div>
        <div className="share-channels">
          <button className="channel-btn" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("שלום, מצורף המסמך החתום: " + doc.name)}`)}>
            <div className="channel-icon" style={{ background: "#25D366" }}><Icon name="whatsapp" size={22} color="#fff" /></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>WhatsApp</div>
          </button>
          <button className="channel-btn" onClick={() => window.open(`mailto:?subject=${encodeURIComponent("מסמך חתום: " + doc.name)}&body=${encodeURIComponent("שלום,\n\nמצורף בזאת המסמך החתום.\n\nתודה!")}`)}>
            <div className="channel-icon" style={{ background: "var(--blue-500)" }}><Icon name="mail" size={20} color="#fff" /></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>אימייל</div>
          </button>
          <button className="channel-btn" onClick={() => downloadDoc && downloadDoc(doc)}>
            <div className="channel-icon" style={{ background: "var(--gray-700)" }}><Icon name="download" size={20} color="#fff" /></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>הורדה שוב</div>
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--gray-500)", margin: "14px 0 0", textAlign: "center", lineHeight: 1.55 }}>
          טיפ: צרף/י את הקובץ שירד למחשב/לטלפון להודעה.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowDone(false)}>סגירה</button>
        </div>
      </Modal>
    </div>
  );
};

window.ClientView = ClientView;

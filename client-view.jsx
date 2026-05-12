// Client signing view — restricted, read-only document with sign-only fields.
// The client can only: view the document comfortably, fill the fields the
// sender assigned to them (with their OWN signature and OWN uploaded stamp),
// and send the signed copy back. No editor sidebars, no tools, no field
// placement, no download/share of the sender's interface.

const { useState: useStateC, useEffect: useEffectC, useRef: useRefC, useMemo: useMemoC } = React;

const CLIENT_STAMP_KEY = "flowbiz-client-stamp-v1";

const ClientView = ({ doc, onUpdate, mySignature, onNeedSignature, onComplete, downloadDoc }) => {
  const template = window.DOC_TEMPLATES[doc.template];
  const senderName = doc.sender || "השולח";
  const counterpartyName = template?.counterparty || doc.counterparty || "אורח/ת";

  const stageRef = useRefC(null);
  const stampInputRef = useRefC(null);
  const [zoom, setZoom] = useStateC(1);
  const [showSummary, setShowSummary] = useStateC(false);
  const [showDone, setShowDone] = useStateC(false);
  const [submitting, setSubmitting] = useStateC(false);
  const [clientStamp, setClientStamp] = useStateC(() => {
    try { return localStorage.getItem(CLIENT_STAMP_KEY); } catch { return null; }
  });

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
  const isCompleted = doc.status === "completed";

  const updateField = (id, patch) => {
    onUpdate({
      ...doc,
      fields: doc.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const onStampFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("גודל מקסימלי לחותמת: 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setClientStamp(dataUrl);
      try { localStorage.setItem(CLIENT_STAMP_KEY, dataUrl); } catch {}
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const fillField = (field, sigOverride, stampOverride) => {
    if (field.assignee !== "them" || isCompleted) return;
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
      const stamp = stampOverride || clientStamp;
      if (!stamp) {
        if (stampInputRef.current) stampInputRef.current.click();
        return;
      }
      updateField(field.id, { value: stamp });
    }
  };

  const scrollToNext = () => {
    const next = theirFields.find((f) => !f.value);
    if (!next) return;
    const pageEl = stageRef.current && stageRef.current.querySelector(`[data-page-idx="${next.page}"]`);
    if (pageEl) {
      const fieldEl = pageEl.querySelector(`[data-field-id="${next.id}"]`);
      (fieldEl || pageEl).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const pages = doc.uploadedPages ? doc.uploadedPages.length : (template ? template.pages : 1);

  const renderField = (field) => {
    // Hide sender's own fields entirely from the client view —
    // the client only sees the spots that they themselves need to fill.
    if (field.assignee === "me") return null;

    const filled = !!field.value;
    const isSystem = field.assignee === "system";
    const mine = field.assignee === "them";
    const interactive = mine && !filled && !isCompleted;
    const stampSrc = field.type === "stamp" && typeof field.value === "string" && field.value.startsWith("data:")
      ? field.value
      : "assets/stamp.png";

    return (
      <div
        key={field.id}
        data-field-id={field.id}
        className={
          "cv-field " +
          (filled ? "cv-field-filled " : "cv-field-empty ") +
          (mine ? "cv-field-mine " : "cv-field-locked ") +
          (isSystem ? "cv-field-system " : "") +
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
          <div className="field-stamp"><img src={stampSrc} alt="stamp" /></div>
        )}
        {filled && (field.type === "date" || field.type === "text") && (
          <div className={"field-text " + (field.type === "date" ? "field-date " : "") + (isSystem ? "field-system" : "")}>{field.value}</div>
        )}
      </div>
    );
  };

  const submitAndShowDone = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete();
      setShowSummary(false);
      setShowDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="client-view">
      <input ref={stampInputRef} type="file" hidden accept="image/png,image/jpeg,image/svg+xml" onChange={onStampFile} />

      <div className="cv-topbar">
        <div className="brand">
          <img src="assets/logo.png" alt="FlowBiz" onError={(e) => (e.target.style.display = "none")} />
          <div>
            <div className="brand-title">חתימה על מסמך</div>
            <div className="brand-sub">FlowBiz Sign · ערוץ מאובטח</div>
          </div>
        </div>
        <div className="cv-top-right">
          {isCompleted && (
            <button className="btn btn-secondary btn-sm" onClick={() => downloadDoc && downloadDoc(doc)}>
              <Icon name="download" size={14} /> הורד עותק חתום
            </button>
          )}
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
            {!isCompleted ? (
              <p>שלום {counterpartyName}, עברו על המסמך. סמני/סמנו את השדות בכתום כדי להשלים את החתימה ולשלוח חזרה.</p>
            ) : (
              <p style={{ color: "var(--green-700)" }}>
                <Icon name="check-circle" size={14} /> המסמך נחתם והוחזר אל {senderName}. אפשר להוריד עותק לשמירה.
              </p>
            )}
            {!nothingToDo && !isCompleted && (
              <div className="cv-progress">
                <div className="bar"><div className="fill" style={{ width: `${(filledCount / theirFields.length) * 100}%` }} /></div>
                <span>{filledCount} מתוך {theirFields.length} שדות הושלמו</span>
              </div>
            )}
          </div>
          {!isCompleted && (
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
          )}
        </div>
      </div>

      {!isCompleted && (
        <div className="cv-tools">
          <div className="cv-tools-inner">
            <div className="cv-tool-card">
              <div className="cv-tool-icon"><Icon name="pen-tool" size={16} /></div>
              <div style={{ flex: 1 }}>
                <div className="cv-tool-title">החתימה שלך</div>
                {mySignature ? (
                  <div className="cv-tool-preview">
                    <img src={mySignature} alt="signature" />
                    <button className="btn btn-ghost btn-sm" onClick={() => onNeedSignature()}>
                      <Icon name="edit" size={12} /> שינוי
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-soft btn-sm" onClick={() => onNeedSignature()}>
                    <Icon name="plus" size={12} /> צור חתימה
                  </button>
                )}
              </div>
            </div>
            <div className="cv-tool-card">
              <div className="cv-tool-icon"><Icon name="stamp" size={16} /></div>
              <div style={{ flex: 1 }}>
                <div className="cv-tool-title">החותמת שלך</div>
                {clientStamp ? (
                  <div className="cv-tool-preview">
                    <img src={clientStamp} alt="stamp" style={{ background: "#fff", borderRadius: 6 }} />
                    <button className="btn btn-ghost btn-sm" onClick={() => stampInputRef.current && stampInputRef.current.click()}>
                      <Icon name="edit" size={12} /> שינוי
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-soft btn-sm" onClick={() => stampInputRef.current && stampInputRef.current.click()}>
                    <Icon name="upload-cloud" size={12} /> העלאת חותמת
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {!isCompleted && !allDone && !nothingToDo && filledCount < theirFields.length && (
        <button className="cv-floating-next" onClick={scrollToNext} title="קפיצה לשדה הבא">
          <Icon name="pen-tool" size={16} />
          השדה הבא ({filledCount + 1}/{theirFields.length})
        </button>
      )}

      <Modal open={showSummary} onClose={() => !submitting && setShowSummary(false)} title="לאשר ולשלוח חזרה?" subtitle={`עם האישור: ייווצר עותק חתום שיורד אליך, וייטבע בו תאריך ושעה אוטומטית. המסמך יישלח חזרה אל ${senderName}.`}>
        <div className="cv-summary">
          <div className="cv-summary-row"><Icon name="file-text" size={16} color="var(--blue-600)" /> {doc.name}</div>
          <div className="cv-summary-row"><Icon name="user-check" size={16} color="var(--green-600)" /> {filledCount} שדות מולאו על ידך</div>
          <div className="cv-summary-row"><Icon name="clock" size={16} color="var(--blue-600)" /> חתימת זמן אוטומטית בסוף המסמך</div>
          <div className="cv-summary-row"><Icon name="shield-check" size={16} color="var(--blue-600)" /> חתימה מאובטחת ושמירה אוטומטית אצל השולח</div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-success" disabled={submitting} onClick={submitAndShowDone}>
            <Icon name={submitting ? "clock" : "check"} size={16} /> {submitting ? "שולח..." : "אישור ושליחה"}
          </button>
          <button className="btn btn-ghost" disabled={submitting} onClick={() => setShowSummary(false)}>חזרה</button>
        </div>
      </Modal>

      <Modal open={showDone} onClose={() => setShowDone(false)} title="המסמך נחתם ונשלח!" subtitle={`עותק חתום ירד אליך וגם נשלח חזרה אל ${senderName}. אפשר לסגור את החלון או להוריד שוב.`}>
        <div className="completion" style={{ padding: "8px 0 18px" }}>
          <div className="completion-circle"><Icon name="check" size={36} color="#fff" /></div>
        </div>
        <div className="cv-summary">
          <div className="cv-summary-row"><Icon name="check-circle" size={16} color="var(--green-600)" /> נשלח אל {senderName}</div>
          <div className="cv-summary-row"><Icon name="download" size={16} color="var(--blue-600)" /> עותק PDF הורד אליך</div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => downloadDoc && downloadDoc(doc)}>
            <Icon name="download" size={16} /> הורדה שוב
          </button>
          <button className="btn btn-ghost" onClick={() => setShowDone(false)}>סגירה</button>
        </div>
      </Modal>
    </div>
  );
};

window.ClientView = ClientView;

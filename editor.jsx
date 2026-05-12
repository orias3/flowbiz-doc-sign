// Editor — opens a doc, lets user place fields, sign, stamp, and share.
const { useState: useStateE, useEffect: useEffectE, useRef: useRefE, useMemo: useMemoE } = React;

const TOOLS = [
  { id: "signature", name: "חתימה", desc: "ציור או הקלדה", icon: "pen-tool", w: 180, h: 70 },
  { id: "stamp", name: "חותמת", desc: "חותמת החברה", icon: "stamp", w: 130, h: 130 },
  { id: "date", name: "תאריך", desc: "מילוי אוטומטי", icon: "calendar", w: 140, h: 32 },
  { id: "text", name: "שם / טקסט", desc: "שורה חופשית", icon: "type", w: 180, h: 32 },
];

const Editor = ({ doc, onUpdate, onBack, onOpenShare, mySignature, onNeedSignature, viewMode = "owner", locked = false }) => {
  // viewMode: 'owner' (full editor) | 'counterparty' (fills their fields only) | 'readonly' (no editing)
  const isReadOnly = viewMode === "readonly" || locked;
  const [tool, setTool] = useStateE(null);
  const [assignee, setAssignee] = useStateE("me"); // "me" or "them"
  const [selectedField, setSelectedField] = useStateE(null);
  const stageRef = useRefE(null);

  const myFields = doc.fields.filter(f => f.assignee === "me");
  const theirFields = doc.fields.filter(f => f.assignee === "them");
  const mySigned = myFields.filter(f => f.value).length;
  const theirSigned = theirFields.filter(f => f.value).length;

  const updateDoc = (next) => onUpdate({ ...doc, ...next });

  // Place a field on click
  const handlePageClick = (e, pageIdx) => {
    if (isReadOnly) return;
    if (viewMode !== "owner" || !tool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const t = TOOLS.find(t => t.id === tool);
    const field = {
      id: genId(),
      type: tool,
      page: pageIdx,
      x: Math.max(10, x - t.w / 2),
      y: Math.max(10, y - t.h / 2),
      w: t.w,
      h: t.h,
      assignee,
      value: null,
    };
    // If it's "me" tool, auto-fill where possible
    if (assignee === "me") {
      if (tool === "stamp") field.value = "stamp";
      else if (tool === "date") field.value = formatDate();
      else if (tool === "signature" && mySignature) field.value = mySignature;
    }
    updateDoc({ fields: [...doc.fields, field] });
    setSelectedField(field.id);
    setTool(null);
  };

  // Drag field
  const onFieldDragStart = (e, field) => {
    if (isReadOnly) return;
    if (e.target.closest(".field-tool-btn") || e.target.closest(".field-resize")) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedField(field.id);
    const startX = e.clientX, startY = e.clientY;
    const sx = field.x, sy = field.y;
    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / zoom, dy = (ev.clientY - startY) / zoom;
      const pageEl = stageRef.current.querySelector(`[data-page-idx="${field.page}"]`);
      const pageRect = pageEl.getBoundingClientRect();
      const pw = pageRect.width / zoom;
      const ph = pageRect.height / zoom;
      const nx = Math.max(0, Math.min(pw - field.w, sx + dx));
      const ny = Math.max(0, Math.min(ph - field.h, sy + dy));
      updateDoc({
        fields: doc.fields.map(f => f.id === field.id ? { ...f, x: nx, y: ny } : f),
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Resize field
  const onResizeStart = (e, field) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const sw = field.w, sh = field.h;
    const ratio = sh / sw;
    const lockRatio = (field.type === "stamp" || field.type === "signature");
    const onMove = (ev) => {
      const dx = (startX - ev.clientX) / zoom; // RTL: drag-left = grow
      const dy = (ev.clientY - startY) / zoom;
      let nw = Math.max(40, sw + dx);
      let nh = Math.max(20, sh + dy);
      if (lockRatio) nh = nw * ratio;
      updateDoc({
        fields: doc.fields.map(f => f.id === field.id ? { ...f, w: nw, h: nh } : f),
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const deleteField = (id) => {
    if (isReadOnly) return;
    updateDoc({ fields: doc.fields.filter(f => f.id !== id) });
    setSelectedField(null);
  };

  const fillField = (field, sigOverride) => {
    if (isReadOnly) return;
    if (field.type === "signature") {
      const sig = sigOverride || mySignature;
      if (!sig) { onNeedSignature((newSig) => fillField(field, newSig)); return; }
      updateDoc({ fields: doc.fields.map(f => f.id === field.id ? { ...f, value: sig } : f) });
    } else if (field.type === "stamp") {
      updateDoc({ fields: doc.fields.map(f => f.id === field.id ? { ...f, value: "stamp" } : f) });
    } else if (field.type === "date") {
      updateDoc({ fields: doc.fields.map(f => f.id === field.id ? { ...f, value: formatDate() } : f) });
    } else if (field.type === "text") {
      const v = prompt("הקלד/י טקסט:", field.value || "");
      if (v != null) updateDoc({ fields: doc.fields.map(f => f.id === field.id ? { ...f, value: v } : f) });
    }
  };

  const renderField = (field) => {
    const filled = !!field.value;
    // Owner can only fill their OWN fields. Counterparty fields are markers reserved for the client.
    const ownerCanFill = viewMode === "owner" && field.assignee === "me";
    const counterpartyCanFill = viewMode === "counterparty" && field.assignee === "them";
    const fillable = ownerCanFill || counterpartyCanFill;
    const myTurn = viewMode === "counterparty" && field.assignee === "them" && !filled;
    const isSystem = field.assignee === "system";
    const stampSrc = field.type === "stamp" && typeof field.value === "string" && field.value.startsWith("data:")
      ? field.value
      : "assets/stamp.png";
    return (
      <div key={field.id}
        className={
          "field " + (filled ? "filled placeholder " : "placeholder ") +
          (field.assignee === "them" ? "counterparty " : "") +
          (isSystem ? "system " : "") +
          (selectedField === field.id ? "selected " : "") +
          (myTurn ? "pulse" : "")
        }
        style={{ left: field.x, top: field.y, width: field.w, height: field.h }}
        onMouseDown={(e) => !isReadOnly && viewMode === "owner" && !isSystem && onFieldDragStart(e, field)}
        onClick={(e) => {
          e.stopPropagation();
          if (isSystem || isReadOnly) return;
          setSelectedField(field.id);
          if (!filled && fillable) fillField(field);
        }}
      >
        {!isSystem && (
          <div className="field-tag">
            {field.assignee === "me" ? "אתה" : "הצד השני"} · {TOOLS.find(t=>t.id===field.type)?.name}
          </div>
        )}
        {viewMode === "owner" && !isSystem && !isReadOnly && (
          <div className="field-tools">
            <button className="field-tool-btn" onClick={(e) => { e.stopPropagation(); deleteField(field.id); }} title="מחיקה">
              <Icon name="trash" size={13}/>
            </button>
          </div>
        )}
        {!filled && !isSystem && (
          <span className="field-label">
            <Icon name={TOOLS.find(t=>t.id===field.type)?.icon} size={13}/>
            {field.assignee === "me" ? "לחתימה שלך" : "ממתין לצד השני"}
          </span>
        )}
        {filled && field.type === "signature" && (
          <div className="field-signature"><img src={field.value} alt="signature"/></div>
        )}
        {filled && field.type === "stamp" && (
          <div className="field-stamp"><img src={stampSrc} alt="stamp"/></div>
        )}
        {filled && field.type === "date" && (
          <div className="field-text field-date">{field.value}</div>
        )}
        {filled && field.type === "text" && (
          <div className={"field-text " + (isSystem ? "field-system" : "")}>{field.value}</div>
        )}
        {viewMode === "owner" && !isSystem && !isReadOnly && (
          <div className="field-resize" onMouseDown={(e) => onResizeStart(e, field)}/>
        )}
      </div>
    );
  };

  const template = DOC_TEMPLATES[doc.template];
  const uploadedPages = doc.uploadedPages;
  const pages = uploadedPages ? uploadedPages.length : (template ? template.pages : 1);
  const [zoom, setZoom] = useStateE(1);
  useEffectE(() => {
    const fit = () => {
      const el = stageRef.current;
      if (!el) return;
      const avail = el.clientWidth - 32;
      const z = Math.max(0.3, Math.min(1, avail / 794));
      setZoom(z);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const cpStatus = doc.shareToken
    ? (theirFields.length > 0 && theirSigned === theirFields.length ? "completed" : "sent")
    : "draft";

  return (
    <div className={"editor " + (viewMode === "readonly" ? "editor-readonly" : "")}>
      {/* RIGHT SIDE (in RTL = first column visually = right): document info & status */}
      <aside className="editor-side right">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 14 }}>
          <Icon name="arrow-right" size={14}/> חזרה למסמכים
        </button>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--blue-900)", margin: "0 0 4px" }}>{doc.name}</h3>
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--gray-500)" }}>
          {template?.category} · {pages} {pages === 1 ? "עמוד" : "עמודים"}
        </p>
        <div style={{ marginBottom: 16 }}>
          {cpStatus === "draft" && <span className="pill pill-neutral"><span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--gray-400)" }}/> טיוטה</span>}
          {cpStatus === "sent" && <span className="pill pill-warn"><Icon name="clock" size={12}/> ממתין לחתימת הצד השני</span>}
          {cpStatus === "completed" && <span className="pill pill-ok"><Icon name="check-circle" size={12}/> חתום ע"י שני הצדדים</span>}
        </div>

        <div className="side-group">
          <p className="side-title">סטטוס חתימות</p>
          <div className="status-stack">
            <div className={"status-row " + (mySigned > 0 && mySigned === myFields.length ? "done" : myFields.length > 0 ? "active" : "")}>
              <div className="icon-wrap">{mySigned === myFields.length && myFields.length > 0 ? <Icon name="check" size={13}/> : <Icon name="user" size={13}/>}</div>
              <div style={{ flex: 1 }}>אתה ({mySigned}/{myFields.length})</div>
            </div>
            <div className={"status-row " + (theirSigned > 0 && theirSigned === theirFields.length ? "done" : doc.shareToken ? "active" : "")}>
              <div className="icon-wrap">{theirSigned === theirFields.length && theirFields.length > 0 ? <Icon name="check" size={13}/> : <Icon name="users" size={13}/>}</div>
              <div style={{ flex: 1 }}>{template?.counterparty || "הצד השני"} ({theirSigned}/{theirFields.length})</div>
            </div>
          </div>
        </div>

        {viewMode === "owner" && (
          <>
            <div className="side-group">
              <p className="side-title">שדות במסמך ({doc.fields.length})</p>
              <div className="field-list">
                {doc.fields.length === 0 && <div style={{ fontSize: 12.5, color: "var(--gray-500)", padding: 12, textAlign: "center", background: "var(--gray-50)", borderRadius: 10 }}>בחר/י כלי משמאל ולחץ על המסמך כדי להוסיף שדה.</div>}
                {doc.fields.map(f => (
                  <div key={f.id}
                    className={"field-list-item " + (selectedField === f.id ? "selected" : "")}
                    onClick={() => {
                      setSelectedField(f.id);
                      const el = stageRef.current.querySelector(`[data-page-idx="${f.page}"]`);
                      if (el) el.scrollIntoView ? null : null;
                    }}
                  >
                    <span className={"who " + (f.assignee === "me" ? "me" : "them")}>
                      {f.assignee === "me" ? "אני" : "צד ב"}
                    </span>
                    <Icon name={TOOLS.find(t=>t.id===f.type)?.icon} size={13} color="var(--gray-600)"/>
                    <span style={{ flex: 1, color: "var(--gray-700)" }}>
                      {TOOLS.find(t=>t.id===f.type)?.name} · עמ' {f.page + 1}
                    </span>
                    {f.value ? <Icon name="check" size={13} color="var(--green-600)"/> : <Icon name="clock" size={13} color="var(--gray-400)"/>}
                  </div>
                ))}
              </div>
            </div>

            <div className="side-group">
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
                onClick={onOpenShare}>
                <Icon name="send" size={16}/>
                שליחה לחתימת הצד השני
              </button>
              {theirFields.length === 0 && <p style={{ fontSize: 11.5, color: "var(--gray-500)", margin: "8px 0 0", textAlign: "center" }}>
                ניתן לשלוח גם בלי שדות לצד השני — הקישור יציג להם רק את המסמך החתום על ידך.
              </p>}
            </div>
          </>
        )}

        {viewMode === "readonly" && (
          <div className="side-group">
            <div className="locked-banner">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Icon name="shield-check" size={16} color="var(--blue-600)"/>
                <strong style={{ color: "var(--blue-800)", fontSize: 13.5 }}>
                  {doc.status === "completed" ? "מסמך חתום ונעול" : "המסמך נשלח — נעול לעריכה"}
                </strong>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--gray-600)", margin: 0, lineHeight: 1.55 }}>
                {doc.status === "completed"
                  ? "המסמך הושלם בידי שני הצדדים. ניתן לצפות בלבד ולהוריד עותק."
                  : "אחרי שליחה הקישור יציג ללקוח את המסמך. כל שינוי כאן מושבת — לקבלת עותק חדש, יש לפתוח מסמך חדש."}
              </p>
            </div>
            {doc.shareId && (
              <div className="locked-link-row">
                <input dir="ltr" readOnly value={`${location.origin}/s/${doc.shareId}`} onClick={(e) => e.target.select()} />
                <button className="btn btn-soft btn-sm" onClick={() => { navigator.clipboard.writeText(`${location.origin}/s/${doc.shareId}`); }}>
                  <Icon name="copy" size={13}/> העתק
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === "counterparty" && (
          <div className="side-group">
            <div style={{ background: "var(--orange-50)", borderRadius: 14, padding: 14, border: "1px solid var(--orange-100)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Icon name="info" size={16} color="var(--orange-600)"/>
                <strong style={{ color: "var(--orange-600)", fontSize: 13.5 }}>תורך לחתום</strong>
              </div>
              <p style={{ fontSize: 13, color: "var(--gray-700)", margin: 0, lineHeight: 1.5 }}>
                לחץ/י על השדות הכתומים במסמך כדי להשלים אותם. כשתסיים, שלח/י את המסמך חזרה.
              </p>
            </div>
            <button className="btn btn-success" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
              disabled={theirSigned < theirFields.length}
              onClick={() => {
                updateDoc({ status: "completed", completedAt: Date.now() });
                window.dispatchEvent(new CustomEvent("cp-complete"));
              }}>
              <Icon name="check" size={16}/> סיום וחתימה
            </button>
          </div>
        )}
      </aside>

      {/* CENTER: pages */}
      <div className="editor-stage" ref={stageRef}>
        <div className="zoom-bar">
          <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} title="הקטנה"><Icon name="zoom-out" size={14}/></button>
          <span className="zoom-val">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="הגדלה"><Icon name="zoom-in" size={14}/></button>
          <button className="zoom-btn" onClick={() => {
            const el = stageRef.current;
            if (!el) return;
            setZoom(Math.max(0.3, Math.min(1, (el.clientWidth - 32) / 794)));
          }} title="התאם לרוחב"><Icon name="maximize" size={14}/></button>
        </div>
        <div className="editor-stage-inner">
          {Array.from({ length: pages }).map((_, pi) => (
            <div key={pi}
              className={"page " + (tool ? "has-tool" : "")}
              data-page-idx={pi}
              style={{ zoom: zoom }}
              onClick={(e) => handlePageClick(e, pi)}
            >
              {uploadedPages
                ? <img src={uploadedPages[pi]} className="page-uploaded" alt="" />
                : (doc.template === "uploaded_file"
                  ? <div className="page-content"><div className="uploaded-placeholder">
                      <Icon name="file-text" size={48} color="var(--gray-400)" />
                      <h3 style={{ margin: "12px 0 4px", color: "var(--gray-700)" }}>{doc.uploadedFileName || doc.name}</h3>
                      <p style={{ color: "var(--gray-500)", fontSize: 13, margin: 0 }}>הוסף שדות חתימה במיקומים הרצויים על המסמך.</p>
                    </div></div>
                  : (template ? template.render(pi) : <div className="page-content"><p>תוכן מסמך</p></div>))
              }
              <div className="page-watermark">עמוד {pi + 1} מתוך {pages} · נחתם דרך FlowBiz Sign</div>
              {doc.fields.filter(f => f.page === pi).map(renderField)}
            </div>
          ))}
        </div>
      </div>

      {/* LEFT SIDE: tools (hidden when read-only) */}
      {viewMode === "readonly" ? null : (
      <aside className="editor-side">
        {viewMode === "owner" ? (
          <>
            <div className="side-group">
              <p className="side-title">למי השדה</p>
              <div className="assignee-toggle">
                <button className={assignee === "me" ? "active me" : ""} onClick={() => setAssignee("me")}>
                  <span className="assignee-dot me"/> אני
                </button>
                <button className={assignee === "them" ? "active them" : ""} onClick={() => setAssignee("them")}>
                  <span className="assignee-dot them"/> {template?.counterparty?.split(" ")[0] || "הצד השני"}
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--gray-500)", margin: "8px 2px 0", lineHeight: 1.5 }}>
                {assignee === "me"
                  ? "השדות שתוסיף יסומנו בכחול ויחתמו על ידך באופן מיידי."
                  : "השדות יסומנו בכתום וימתינו לחתימת הצד השני."}
              </p>
            </div>

            <div className="side-group">
              <p className="side-title">כלים — לחץ ואז סמן על המסמך</p>
              <div className="tool-row">
                {TOOLS.map(t => (
                  <div key={t.id}
                    className={"tool-card " + (tool === t.id ? "active" : "")}
                    onClick={() => setTool(tool === t.id ? null : t.id)}
                  >
                    <div className="tool-icon"><Icon name={t.icon} size={16}/></div>
                    <div className="tool-name">{t.name}</div>
                    <div className="tool-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="side-group">
              <p className="side-title">החתימה שלך</p>
              <div style={{ background: "var(--gray-50)", borderRadius: 14, padding: "16px 12px", textAlign: "center", border: "1px solid var(--gray-100)" }}>
                {mySignature ? (
                  <>
                    <img src={mySignature} alt="signature" style={{ maxWidth: "100%", maxHeight: 60, margin: "0 auto" }}/>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                      onClick={() => onNeedSignature()}>
                      <Icon name="edit" size={13}/> שינוי חתימה
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ color: "var(--gray-500)", fontSize: 13, marginBottom: 8 }}>
                      עדיין לא יצרת חתימה
                    </div>
                    <button className="btn btn-soft btn-sm" onClick={() => onNeedSignature()}>
                      <Icon name="pen-tool" size={13}/> צור חתימה
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="side-group">
              <p className="side-title">חותמת החברה</p>
              <div style={{ background: "var(--gray-50)", borderRadius: 14, padding: "12px", border: "1px solid var(--gray-100)", display: "flex", alignItems: "center", gap: 10 }}>
                <img src="assets/stamp.png" style={{ width: 56, height: 56, objectFit: "contain" }}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-800)" }}>או או טו סטראטעפס בע״מ</div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-500)" }}>ח.פ. 517268330</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="side-group">
            <p className="side-title">חתימת הצד השני</p>
            <div style={{ background: "var(--gray-50)", borderRadius: 14, padding: "16px 12px", textAlign: "center", border: "1px solid var(--gray-100)" }}>
              {mySignature ? (
                <>
                  <img src={mySignature} alt="signature" style={{ maxWidth: "100%", maxHeight: 60, margin: "0 auto" }}/>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => onNeedSignature()}>
                    <Icon name="edit" size={13}/> שינוי
                  </button>
                </>
              ) : (
                <button className="btn btn-soft btn-sm" onClick={() => onNeedSignature()}>
                  <Icon name="pen-tool" size={13}/> צור חתימה
                </button>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--gray-500)", margin: "10px 2px 0", lineHeight: 1.5 }}>
              לאחר יצירת החתימה, לחץ/י על השדות הכתומים במסמך כדי להחיל אותה. שדות תאריך וטקסט יתמלאו בעת לחיצה.
            </p>
          </div>
        )}
      </aside>
      )}
    </div>
  );
};

window.Editor = Editor;

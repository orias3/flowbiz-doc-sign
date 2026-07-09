// Signature pad — draw, type, or upload from file
const { useState, useRef, useEffect } = React;

const SIG_FONT_FAMILY = "'Heebo', sans-serif";

const SignaturePad = ({ open, onClose, onSave, defaultName = "", defaultMode = "auto", savedSignatures = [] }) => {
  // mode: draw | type | upload | saved | auto (auto resolves to saved or draw on open)
  const resolveInitialMode = (m) => m === "auto" ? (savedSignatures.length > 0 ? "saved" : "draw") : m;
  const [mode, setMode] = useState(() => resolveInitialMode(defaultMode));
  const [typed, setTyped] = useState(defaultName);
  const [uploaded, setUploaded] = useState(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const drawing = useRef(false);
  const last = useRef(null);

  // Reset mode when reopening — 'auto' picks saved tab if saved sigs exist, else draw.
  useEffect(() => {
    if (open) setMode(resolveInitialMode(defaultMode));
  }, [open, defaultMode, savedSignatures.length]);

  useEffect(() => {
    if (!open || mode !== "draw") return;
    setTimeout(() => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#0E2A5C";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }, 40);
  }, [open, mode]);

  const pos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    setHasStrokes(true);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const p = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    setHasStrokes(false);
  };

  const onUploadFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert("גודל מקסימלי לחתימה: 4MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setUploaded(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const save = () => {
    if (mode === "upload") {
      if (!uploaded) return;
      onSave(uploaded);
      onClose();
      return;
    }
    if (mode === "draw") {
      if (!hasStrokes) return;
      const c = canvasRef.current;
      const ctx = c.getContext("2d");
      const img = ctx.getImageData(0, 0, c.width, c.height);
      let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (img.data[(y * c.width + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX <= minX || maxY <= minY) { onSave(c.toDataURL("image/png")); onClose(); return; }
      const pad = 8;
      const w = Math.min(c.width, maxX - minX + pad * 2);
      const h = Math.min(c.height, maxY - minY + pad * 2);
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      out.getContext("2d").drawImage(c, Math.max(0, minX - pad), Math.max(0, minY - pad), w, h, 0, 0, w, h);
      onSave(out.toDataURL("image/png"));
      onClose();
      return;
    }
    if (mode === "type") {
      if (!typed.trim()) return;
      const c = document.createElement("canvas");
      const dpr = 2;
      c.width = 800 * dpr; c.height = 220 * dpr;
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#0E2A5C";
      ctx.font = `700 56px ${SIG_FONT_FAMILY}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.fillText(typed, 400, 110);
      const img = ctx.getImageData(0, 0, c.width, c.height);
      let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (img.data[(y * c.width + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const pad = 16;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      out.getContext("2d").drawImage(c, minX - pad, minY - pad, w, h, 0, 0, w, h);
      onSave(out.toDataURL("image/png"));
    }
    onClose();
  };

  const canSave = mode === "draw" ? hasStrokes : mode === "type" ? !!typed.trim() : mode === "upload" ? !!uploaded : false;

  return (
    <Modal open={open} onClose={onClose} wide
      title="צור את החתימה שלך"
      subtitle="צייר/י, הקליד/י שם או העלה/י תמונת חתימה — נשמור אותה לשימוש חוזר במסמכים הבאים."
    >
      <div className="sigpad-tabs">
        <button className={mode === "draw" ? "active" : ""} onClick={() => setMode("draw")}>ציור חופשי</button>
        <button className={mode === "type" ? "active" : ""} onClick={() => setMode("type")}>הקלדת שם</button>
        <button className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>העלאה מקובץ</button>
        <button className={mode === "saved" ? "active" : ""} onClick={() => setMode("saved")}>שמורות{savedSignatures.length > 0 ? ` (${savedSignatures.length})` : ""}</button>
      </div>

      {mode === "saved" && (
        savedSignatures.length === 0 ? (
          <div className="sigpad-saved-empty">
            <div style={{ fontSize: 14, color: "var(--gray-600)", textAlign: "center", lineHeight: 1.6 }}>
              אין חתימות שמורות עדיין.<br/>
              עבור/עברי לטאב "ציור חופשי" / "העלאה מקובץ" כדי ליצור את הראשונה — היא תופיע כאן בפעם הבאה.
            </div>
          </div>
        ) : (
          <div className="sigpad-saved-grid">
            {savedSignatures.map((s) => (
              <button key={s.id} type="button" className="sigpad-saved-card" onClick={() => { onSave(s.dataUrl); onClose(); }}>
                <div className="sigpad-saved-img"><img src={s.dataUrl} alt={s.name}/></div>
                <div className="sigpad-saved-name">{s.name || "ללא שם"}</div>
              </button>
            ))}
          </div>
        )
      )}

      {mode === "draw" && (
        <>
          <div className="sigpad-canvas">
            <canvas ref={canvasRef}
              onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
              onTouchStart={start} onTouchMove={move} onTouchEnd={end}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
            <div className="sigpad-baseline"/>
            {!hasStrokes && <div className="sigpad-hint">חתום/חתמי כאן</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "var(--gray-500)" }}>
            <span>טיפ: אפשר להשתמש בעכבר, באצבע או בעט אלקטרוני.</span>
            <button className="btn btn-ghost btn-sm" onClick={clear}>
              <Icon name="rotate" size={14}/> ניקוי
            </button>
          </div>
        </>
      )}

      {mode === "type" && (
        <>
          <input
            value={typed} onChange={e => setTyped(e.target.value)}
            placeholder="הקלד/י את שמך המלא"
            style={{
              width: "100%", border: "1.5px solid var(--gray-200)", borderRadius: 10,
              padding: "12px 14px", fontSize: 14, marginBottom: 12, outline: "none",
              fontFamily: "inherit"
            }}
          />
          <div className="sigpad-typed" style={{ fontFamily: SIG_FONT_FAMILY, fontWeight: 700 }}>
            {typed || "השם שלך…"}
          </div>
        </>
      )}

      {mode === "upload" && (
        <>
          <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/svg+xml" onChange={onUploadFile} />
          <div className="sigpad-upload">
            {uploaded ? (
              <div className="sigpad-upload-preview">
                <img src={uploaded} alt="signature" />
                <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>
                  <Icon name="upload-cloud" size={14}/> בחר/י קובץ אחר
                </button>
              </div>
            ) : (
              <button className="sigpad-upload-empty" onClick={() => fileRef.current && fileRef.current.click()}>
                <div className="sigpad-upload-circle"><Icon name="upload-cloud" size={26}/></div>
                <div style={{ fontWeight: 700, color: "var(--blue-900)", marginTop: 8 }}>העלאת תמונת חתימה</div>
                <div style={{ fontSize: 12.5, color: "var(--gray-500)", marginTop: 2 }}>PNG / JPG / SVG · עד 4MB · רקע שקוף מומלץ</div>
              </button>
            )}
          </div>
        </>
      )}

      <div className="modal-actions">
        <button className="btn btn-primary" onClick={save} disabled={!canSave}>
          <Icon name="check" size={16}/> שמירת חתימה
        </button>
        <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
      </div>
    </Modal>
  );
};

window.SignaturePad = SignaturePad;

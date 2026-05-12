// Signature pad — draw or type
const { useState, useRef, useEffect } = React;

const SIG_FONTS = [
  { name: "Caveat", family: "'Caveat', cursive" },
  { name: "Dancing Script", family: "'Dancing Script', cursive" },
  { name: "Sacramento", family: "'Sacramento', cursive" },
];

const SignaturePad = ({ open, onClose, onSave, defaultName = "" }) => {
  const [mode, setMode] = useState("draw"); // draw | type
  const [typed, setTyped] = useState(defaultName);
  const [fontIdx, setFontIdx] = useState(0);
  const canvasRef = useRef(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const drawing = useRef(false);
  const last = useRef(null);

  useEffect(() => {
    if (!open) return;
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

  const save = () => {
    if (mode === "draw") {
      if (!hasStrokes) return;
      const c = canvasRef.current;
      // Trim to content
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
    } else {
      if (!typed.trim()) return;
      // Render typed signature to canvas
      const c = document.createElement("canvas");
      const dpr = 2;
      c.width = 800 * dpr; c.height = 220 * dpr;
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#0E2A5C";
      const fam = SIG_FONTS[fontIdx].family;
      ctx.font = `64px ${fam}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.fillText(typed, 400, 110);
      // Trim
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

  return (
    <Modal open={open} onClose={onClose} wide
      title="צור את החתימה שלך"
      subtitle="בחר/י לצייר את החתימה או להקליד את השם — נשמור אותה לשימוש חוזר במסמכים הבאים."
    >
      <div className="sigpad-tabs">
        <button className={mode === "draw" ? "active" : ""} onClick={() => setMode("draw")}>
          ציור חופשי
        </button>
        <button className={mode === "type" ? "active" : ""} onClick={() => setMode("type")}>
          הקלדת שם
        </button>
      </div>

      {mode === "draw" ? (
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
      ) : (
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
          <div className="sigpad-typed" style={{ fontFamily: SIG_FONTS[fontIdx].family }}>
            {typed || "השם שלך…"}
          </div>
          <div className="font-choice">
            {SIG_FONTS.map((f, i) => (
              <button key={f.name}
                onClick={() => setFontIdx(i)}
                className={i === fontIdx ? "active" : ""}
                style={{ fontFamily: f.family }}
              >{typed || "Signature"}</button>
            ))}
          </div>
        </>
      )}

      <div className="modal-actions">
        <button className="btn btn-primary" onClick={save}
          disabled={mode === "draw" ? !hasStrokes : !typed.trim()}>
          <Icon name="check" size={16}/> שמירת חתימה
        </button>
        <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
      </div>
    </Modal>
  );
};

window.SignaturePad = SignaturePad;

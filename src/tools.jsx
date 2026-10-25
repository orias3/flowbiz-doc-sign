// Library tools: statistics + backup export/import.
// Pure UI; data and side effects come in through props from App.

import { mergeById, validateBackup } from './backup-merge.js';

const { useState: useStateT, useMemo: useMemoT, useRef: useRefT } = React;

const STATS_PERIODS = [
  { key: "month", label: "החודש" },
  { key: "prev", label: "חודש שעבר" },
  { key: "90d", label: "90 יום" },
  { key: "all", label: "הכל" },
];

function periodRange(key) {
  const now = new Date();
  if (key === "month") return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), Infinity];
  if (key === "prev") return [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime()];
  if (key === "90d") return [Date.now() - 90 * 86400000, Infinity];
  return [0, Infinity];
}

function formatDuration(ms) {
  if (!(ms > 0)) return "—";
  const h = ms / 3600000;
  if (h < 1) return "פחות משעה";
  if (h < 48) return `${Math.round(h)} שעות`;
  return `${Math.round(h / 24)} ימים`;
}

const STATS_TYPES = [
  { key: "flowbiz_quote", label: "הצעות מחיר" },
  { key: "bank_transfer", label: "העברות לבנק" },
  { key: "sales_call", label: "סיכומי שיחה" },
  { key: "other", label: "מסמכים אחרים" },
];

export function computeStats(docs, statusOf, periodKey) {
  const [from, to] = periodRange(periodKey);
  const inRange = (ts) => { const n = Number(ts) || 0; return n >= from && n < to && n > 0; };
  const live = (docs || []).filter((d) => d && !d._deleted);
  const typeOf = (d) => (STATS_TYPES.some((t) => t.key === d.template) ? d.template : "other");

  const created = live.filter((d) => inRange(d.createdAt));
  const sent = live.filter((d) => inRange(d.sentAt));
  const signed = live.filter((d) => statusOf(d) === "completed" && inRange(d.completedAt));
  const sentSigned = sent.filter((d) => statusOf(d) === "completed");
  const durations = signed
    .filter((d) => d.sentAt && d.completedAt && d.completedAt > d.sentAt)
    .map((d) => d.completedAt - d.sentAt);
  const avgSign = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const waiting = live
    .filter((d) => statusOf(d) === "sent")
    .map((d) => ({ id: d.id, name: d.name, since: Number(d.sentAt) || Number(d.updatedAt) || Number(d.createdAt) || 0 }))
    .sort((a, b) => a.since - b.since);

  const calls = created.filter((d) => d.template === "sales_call");
  const closed = calls.filter((d) => d.salesCallData && d.salesCallData.purchased);

  const byType = STATS_TYPES.map((t) => ({
    ...t,
    created: created.filter((d) => typeOf(d) === t.key).length,
    sent: sent.filter((d) => typeOf(d) === t.key).length,
    signed: signed.filter((d) => typeOf(d) === t.key).length,
  }));

  return {
    created: created.length,
    sent: sent.length,
    signed: signed.length,
    signRate: sent.length ? Math.round((sentSigned.length / sent.length) * 100) : null,
    avgSign,
    waiting,
    calls: calls.length,
    closed: closed.length,
    closeRate: calls.length ? Math.round((closed.length / calls.length) * 100) : null,
    byType,
  };
}

export const StatsModal = ({ open, onClose, docs, statusOf, onOpenDoc }) => {
  const [period, setPeriod] = useStateT("month");
  const s = useMemoT(() => computeStats(docs, statusOf, period), [docs, statusOf, period]);
  const daysSince = (ts) => (ts ? Math.max(0, Math.floor((Date.now() - ts) / 86400000)) : null);
  return (
    <Modal open={open} onClose={onClose} wide title="נתונים" subtitle="מה נוצר, מה נשלח ומה נחתם, לפי תקופה.">
      <div className="lib-chips" style={{ marginBottom: 16 }}>
        {STATS_PERIODS.map((p) => (
          <button key={p.key} className={"lib-chip " + (period === p.key ? "active" : "")} onClick={() => setPeriod(p.key)}>{p.label}</button>
        ))}
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-num">{s.created}</div><div className="kpi-lbl">נוצרו</div></div>
        <div className="kpi"><div className="kpi-num">{s.sent}</div><div className="kpi-lbl">נשלחו לחתימה</div></div>
        <div className="kpi"><div className="kpi-num">{s.signed}</div><div className="kpi-lbl">נחתמו</div></div>
        <div className="kpi"><div className="kpi-num">{s.signRate == null ? "—" : `${s.signRate}%`}</div><div className="kpi-lbl">מהנשלחים נחתמו</div></div>
        <div className="kpi"><div className="kpi-num kpi-num-sm">{formatDuration(s.avgSign)}</div><div className="kpi-lbl">זמן ממוצע עד חתימה</div></div>
        <div className="kpi"><div className="kpi-num">{s.closeRate == null ? "—" : `${s.closeRate}%`}</div><div className="kpi-lbl">שיחות מכירה שנסגרו ({s.closed} מתוך {s.calls})</div></div>
      </div>

      <table className="stats-table">
        <thead><tr><th>סוג</th><th>נוצרו</th><th>נשלחו</th><th>נחתמו</th></tr></thead>
        <tbody>
          {s.byType.map((t) => (
            <tr key={t.key}><td>{t.label}</td><td>{t.created}</td><td>{t.sent}</td><td>{t.signed}</td></tr>
          ))}
        </tbody>
      </table>

      <h3 className="stats-h3">ממתינים לחתימה עכשיו ({s.waiting.length})</h3>
      {s.waiting.length === 0
        ? <p className="stats-empty">אין מסמכים שממתינים לחתימה.</p>
        : (
          <div className="stats-waiting">
            {s.waiting.slice(0, 8).map((w) => {
              const days = daysSince(w.since);
              return (
                <button key={w.id} className="stats-waiting-row" onClick={() => { onClose(); onOpenDoc(w.id); }}>
                  <span className="stats-waiting-name">{w.name}</span>
                  <span className={"pill " + (days >= 7 ? "pill-warn" : "pill-neutral")}>
                    {days == null ? "—" : days === 0 ? "נשלח היום" : `${days} ימים`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>סגירה</button>
      </div>
    </Modal>
  );
};

function backupFileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `flowbiz-sign-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

// getState() -> { docs, vendors, savedSignatures } (full lists incl. deletions)
// applyMerged({ docs, vendors, savedSignatures }) writes the merged lists back.
export const BackupModal = ({ open, onClose, getState, applyMerged, adminEmail, showToast }) => {
  const fileRef = useRefT(null);
  const [busy, setBusy] = useStateT(false);

  const doExport = () => {
    const st = getState();
    const payload = {
      app: "flowbiz-sign", kind: "backup", version: 1,
      exportedAt: new Date().toISOString(), exportedBy: adminEmail || "",
      docs: st.docs || [], vendors: st.vendors || [], savedSignatures: st.savedSignatures || [],
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = backupFileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    const live = (payload.docs || []).filter((d) => d && !d._deleted).length;
    showToast(`הגיבוי ירד למחשב (${live} מסמכים)`);
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      let data;
      try { data = JSON.parse(await file.text()); } catch { data = null; }
      const err = validateBackup(data);
      if (err) { await uiAlert({ title: "אי אפשר לשחזר מהקובץ", message: err }); return; }
      const st = getState();
      const docsM = mergeById(st.docs, data.docs);
      const vendM = mergeById(st.vendors, data.vendors);
      const sigM = mergeById(st.savedSignatures, data.savedSignatures);
      if (!docsM.added && !docsM.updated && !vendM.added && !vendM.updated && !sigM.added && !sigM.updated) {
        await uiAlert({ title: "אין מה לשחזר", message: "כל מה שבקובץ כבר קיים כאן, באותה גרסה או בגרסה חדשה יותר." });
        return;
      }
      const lines = [
        `מסמכים: ${docsM.added} חדשים, ${docsM.updated} יתעדכנו לגרסה מהקובץ.`,
        (vendM.added || vendM.updated) ? `ספקים: ${vendM.added} חדשים, ${vendM.updated} יתעדכנו.` : "",
        (sigM.added || sigM.updated) ? `חתימות שמורות: ${sigM.added} חדשות, ${sigM.updated} יתעדכנו.` : "",
        "מסמכים שעודכנו כאן אחרי הגיבוי נשארים כמו שהם.",
      ].filter(Boolean).join("\n");
      const ok = await uiConfirm({ title: "לשחזר מהגיבוי?", message: lines, confirmLabel: "שחזור" });
      if (!ok) return;
      applyMerged({ docs: docsM.items, vendors: vendM.items, savedSignatures: sigM.items });
      showToast("השחזור הושלם");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="גיבוי" subtitle="קובץ אחד עם כל המסמכים, הספקים והחתימות השמורות.">
      <input ref={fileRef} type="file" hidden accept="application/json,.json" onChange={onFile} />
      <div className="backup-actions">
        <button className="backup-tile" onClick={doExport}>
          <span className="backup-tile-icon"><Icon name="download" size={20} /></span>
          <span className="backup-tile-title">הורדת גיבוי</span>
          <span className="backup-tile-sub">שומר קובץ JSON במחשב</span>
        </button>
        <button className="backup-tile" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>
          <span className="backup-tile-icon"><Icon name="upload" size={20} /></span>
          <span className="backup-tile-title">{busy ? "בודק את הקובץ..." : "שחזור מקובץ"}</span>
          <span className="backup-tile-sub">מוסיף מה שחסר, לא דורס גרסה חדשה יותר</span>
        </button>
      </div>
      <p className="backup-note">בנוסף, השרת שומר אוטומטית 40 גרסאות אחרונות של הספרייה.</p>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>סגירה</button>
      </div>
    </Modal>
  );
};

Object.assign(window, { StatsModal, BackupModal, computeStats });

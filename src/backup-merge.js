// Merge a backup file into the local library without ever losing newer data.
// Same rule as the server merge (api/admin/state.js): items are matched by id
// and the entry with the newest timestamp wins (updatedAt or deletedAt, so a
// newer deletion beats an older copy and an older backup never resurrects a
// doc that was deleted later). Items only in the backup are added.

export function itemStamp(x) {
  return Math.max(Number(x && x.updatedAt) || 0, Number(x && x.deletedAt) || 0, Number(x && x.createdAt) || 0);
}

// Returns { items, added, updated, skipped } — `items` keeps local order and
// appends backup-only items at the end.
export function mergeById(local, incoming) {
  const out = Array.isArray(local) ? local.slice() : [];
  const index = new Map();
  out.forEach((x, i) => { if (x && x.id) index.set(x.id, i); });
  let added = 0, updated = 0, skipped = 0;
  for (const x of Array.isArray(incoming) ? incoming : []) {
    if (!x || typeof x !== "object" || !x.id) { skipped++; continue; }
    if (!index.has(x.id)) {
      index.set(x.id, out.length);
      out.push(x);
      if (!x._deleted) added++;
      continue;
    }
    const i = index.get(x.id);
    if (itemStamp(x) > itemStamp(out[i])) { out[i] = x; updated++; } else skipped++;
  }
  return { items: out, added, updated, skipped };
}

// Validates a parsed backup file. Returns an error string or null.
export function validateBackup(data) {
  if (!data || typeof data !== "object") return "הקובץ אינו קובץ גיבוי תקין.";
  if (!Array.isArray(data.docs)) return "בקובץ אין רשימת מסמכים.";
  if (data.docs.some((d) => !d || typeof d !== "object" || !d.id)) return "חלק מהמסמכים בקובץ פגומים.";
  return null;
}

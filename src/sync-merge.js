// Adopting server state without losing edits made while a request was in
// flight. The server's reply reflects the snapshot we sent; anything changed
// locally after that snapshot (e.g. a field dragged during the round trip)
// is newer and must win, or the UI "jumps back" to the old position.
// Same timestamp rule as the server merge: max(updatedAt, deletedAt).

export function syncStamp(d) {
  return Math.max(Number(d && d.updatedAt) || 0, Number(d && d.deletedAt) || 0);
}

// Returns { items, keptLocal } — `keptLocal` is true when at least one local
// item was newer than the server's (so another push is needed).
export function preferNewer(serverList, localList) {
  const server = Array.isArray(serverList) ? serverList : [];
  const local = Array.isArray(localList) ? localList : [];
  const localById = new Map();
  local.forEach((d) => { if (d && d.id) localById.set(d.id, d); });
  const serverIds = new Set();
  let keptLocal = false;
  const merged = server.map((s) => {
    if (!s || !s.id) return s;
    serverIds.add(s.id);
    const l = localById.get(s.id);
    if (l && syncStamp(l) > syncStamp(s)) { keptLocal = true; return l; }
    return s;
  });
  // Items created locally after the snapshot was sent are not on the server yet.
  const localOnly = local.filter((d) => d && d.id && !serverIds.has(d.id));
  if (localOnly.length) keptLocal = true;
  return { items: [...localOnly, ...merged], keptLocal };
}

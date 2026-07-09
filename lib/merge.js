// Pure merge helpers shared by the admin-state API and unit tests.
//
// Model: every syncable entity (doc / vendor / saved signature) carries
//   - id           — stable identity
//   - updatedAt    — ms timestamp of the last local edit
//   - _deleted     — soft-delete tombstone flag
//   - deletedAt    — ms timestamp of the deletion
// Two admins can edit concurrently from different devices; the server merges
// each PUT against its current state per-id, newest timestamp wins, so edits
// to DIFFERENT entities never clobber each other.

export const TOMBSTONE_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function stampOf(item) {
  return Math.max(Number(item && item.updatedAt) || 0, Number(item && item.deletedAt) || 0);
}

// Merge `incoming` (one client's full list) into `prev` (server's list).
// - union by id
// - for each id, the entry with the newer stamp wins
// - entries with no stamp on either side: incoming wins (legacy last-write behavior)
// - tombstones older than ttlMs are pruned so lists don't grow forever
export function mergeById(prev, incoming, { ttlMs = TOMBSTONE_TTL_MS, now = Date.now() } = {}) {
  const prevList = Array.isArray(prev) ? prev : [];
  const incomingList = Array.isArray(incoming) ? incoming : [];
  const byId = new Map();
  for (const item of prevList) {
    if (item && item.id) byId.set(item.id, item);
  }
  for (const item of incomingList) {
    if (!item || !item.id) continue;
    const existing = byId.get(item.id);
    if (!existing || stampOf(item) >= stampOf(existing)) byId.set(item.id, item);
  }
  return Array.from(byId.values()).filter(
    (item) => !(item && item._deleted && item.deletedAt && now - item.deletedAt > ttlMs)
  );
}

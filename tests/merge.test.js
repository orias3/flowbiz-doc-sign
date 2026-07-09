import { describe, it, expect } from 'vitest';
import { mergeById, TOMBSTONE_TTL_MS } from '../lib/merge.js';

const now = Date.now();

describe('mergeById', () => {
  it('unions entries from both sides', () => {
    const prev = [{ id: 'a', updatedAt: 1 }];
    const incoming = [{ id: 'b', updatedAt: 2 }];
    const merged = mergeById(prev, incoming);
    expect(merged.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('keeps the newer entry per id', () => {
    const prev = [{ id: 'a', name: 'server', updatedAt: 100 }];
    const incoming = [{ id: 'a', name: 'client', updatedAt: 50 }];
    expect(mergeById(prev, incoming)[0].name).toBe('server');
    expect(mergeById(prev, [{ id: 'a', name: 'client', updatedAt: 200 }])[0].name).toBe('client');
  });

  it('incoming wins when neither side has a timestamp (legacy last-write)', () => {
    const prev = [{ id: 'a', name: 'old' }];
    const incoming = [{ id: 'a', name: 'new' }];
    expect(mergeById(prev, incoming)[0].name).toBe('new');
  });

  it('two admins editing different entries never clobber each other', () => {
    const server = [{ id: 'a', name: 'A1', updatedAt: 10 }, { id: 'b', name: 'B1', updatedAt: 10 }];
    const admin1 = [{ id: 'a', name: 'A2', updatedAt: 20 }, { id: 'b', name: 'B1', updatedAt: 10 }];
    const afterA1 = mergeById(server, admin1);
    // admin2 pushes a stale list that never saw A2
    const admin2 = [{ id: 'a', name: 'A1', updatedAt: 10 }, { id: 'b', name: 'B2', updatedAt: 30 }];
    const final = mergeById(afterA1, admin2);
    expect(final.find((x) => x.id === 'a').name).toBe('A2');
    expect(final.find((x) => x.id === 'b').name).toBe('B2');
  });

  it('deletion tombstones propagate and beat older edits', () => {
    const server = [{ id: 'a', name: 'x', updatedAt: 10 }];
    const incoming = [{ id: 'a', _deleted: true, deletedAt: now, updatedAt: now }];
    const merged = mergeById(server, incoming);
    expect(merged[0]._deleted).toBe(true);
  });

  it('a deleted entry is not resurrected by a stale full list', () => {
    const server = [{ id: 'a', _deleted: true, deletedAt: now, updatedAt: now }];
    const staleClient = [{ id: 'a', name: 'zombie', updatedAt: now - 5000 }];
    const merged = mergeById(server, staleClient);
    expect(merged[0]._deleted).toBe(true);
  });

  it('prunes tombstones older than the TTL', () => {
    const old = now - TOMBSTONE_TTL_MS - 1000;
    const server = [{ id: 'a', _deleted: true, deletedAt: old, updatedAt: old }];
    expect(mergeById(server, [], { now })).toEqual([]);
  });

  it('handles null/undefined lists', () => {
    expect(mergeById(null, undefined)).toEqual([]);
    expect(mergeById(undefined, [{ id: 'a' }]).length).toBe(1);
  });
});

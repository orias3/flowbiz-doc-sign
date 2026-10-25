import { describe, it, expect } from 'vitest';
import { preferNewer } from '../src/sync-merge.js';

const field = (x) => ({ id: 'f1', type: 'stamp', x, y: 10 });

describe('preferNewer (adopting server replies)', () => {
  it('keeps a field moved locally while the push was in flight', () => {
    const server = [{ id: 'd', fields: [field(100)], updatedAt: 1000 }];
    const local = [{ id: 'd', fields: [field(250)], updatedAt: 1500 }];
    const r = preferNewer(server, local);
    expect(r.items[0].fields[0].x).toBe(250);
    expect(r.keptLocal).toBe(true);
  });

  it('adopts the server copy when it is newer (other admin edited)', () => {
    const server = [{ id: 'd', name: 'theirs', updatedAt: 2000 }];
    const local = [{ id: 'd', name: 'mine', updatedAt: 1000 }];
    const r = preferNewer(server, local);
    expect(r.items[0].name).toBe('theirs');
    expect(r.keptLocal).toBe(false);
  });

  it('adds docs the other admin created', () => {
    const r = preferNewer([{ id: 'a', updatedAt: 1 }, { id: 'b', updatedAt: 1 }], [{ id: 'a', updatedAt: 1 }]);
    expect(r.items.map((d) => d.id).sort()).toEqual(['a', 'b']);
    expect(r.keptLocal).toBe(false);
  });

  it('keeps docs created locally after the snapshot', () => {
    const r = preferNewer([{ id: 'a', updatedAt: 1 }], [{ id: 'new', updatedAt: 5 }, { id: 'a', updatedAt: 1 }]);
    expect(r.items.map((d) => d.id)).toEqual(['new', 'a']);
    expect(r.keptLocal).toBe(true);
  });

  it('a newer local deletion is not undone by the reply', () => {
    const server = [{ id: 'd', name: 'x', updatedAt: 1000 }];
    const local = [{ id: 'd', _deleted: true, deletedAt: 1200, updatedAt: 1200 }];
    expect(preferNewer(server, local).items[0]._deleted).toBe(true);
  });

  it('identical timestamps take the server copy', () => {
    const r = preferNewer([{ id: 'd', v: 's', updatedAt: 5 }], [{ id: 'd', v: 'l', updatedAt: 5 }]);
    expect(r.items[0].v).toBe('s');
    expect(r.keptLocal).toBe(false);
  });
});

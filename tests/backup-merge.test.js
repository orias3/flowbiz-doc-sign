import { describe, it, expect } from 'vitest';
import { mergeById, validateBackup } from '../src/backup-merge.js';

describe('mergeById (backup import)', () => {
  it('adds docs that exist only in the backup', () => {
    const r = mergeById([{ id: 'a', updatedAt: 5 }], [{ id: 'b', updatedAt: 1 }]);
    expect(r.items.map((d) => d.id)).toEqual(['a', 'b']);
    expect(r.added).toBe(1);
  });

  it('never replaces a newer local doc with an older backup copy', () => {
    const local = [{ id: 'a', name: 'new', updatedAt: 200 }];
    const r = mergeById(local, [{ id: 'a', name: 'old', updatedAt: 100 }]);
    expect(r.items[0].name).toBe('new');
    expect(r.skipped).toBe(1);
  });

  it('takes the backup copy when it is newer', () => {
    const r = mergeById([{ id: 'a', name: 'old', updatedAt: 100 }], [{ id: 'a', name: 'new', updatedAt: 200 }]);
    expect(r.items[0].name).toBe('new');
    expect(r.updated).toBe(1);
  });

  it('does not resurrect a doc deleted after the backup was taken', () => {
    const local = [{ id: 'a', _deleted: true, deletedAt: 300, updatedAt: 300 }];
    const r = mergeById(local, [{ id: 'a', name: 'doc', updatedAt: 100 }]);
    expect(r.items[0]._deleted).toBe(true);
  });

  it('keeps local docs that are missing from the backup', () => {
    const r = mergeById([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }]);
    expect(r.items.map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('ignores malformed entries', () => {
    const r = mergeById([], [null, { name: 'no id' }, { id: 'ok' }]);
    expect(r.items.map((d) => d.id)).toEqual(['ok']);
    expect(r.skipped).toBe(2);
  });
});

describe('validateBackup', () => {
  it('rejects non-backups', () => {
    expect(validateBackup(null)).toBeTruthy();
    expect(validateBackup({})).toBeTruthy();
    expect(validateBackup({ docs: [{ name: 'x' }] })).toBeTruthy();
  });
  it('accepts a backup with docs', () => {
    expect(validateBackup({ docs: [{ id: 'a' }] })).toBeNull();
  });
});

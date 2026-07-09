import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, isEnvelope } from '../lib/state-crypto.js';

const SECRET = 'test-secret-12345';
const state = { docs: [{ id: 'a', name: 'מסמך בדיקה' }], vendors: [], _meta: { version: 3 } };

describe('state-crypto', () => {
  it('round-trips through an encrypted envelope', () => {
    const stored = encodeState(state, SECRET);
    const parsed = JSON.parse(stored);
    expect(isEnvelope(parsed)).toBe(true);
    expect(stored).not.toContain('מסמך בדיקה');
    expect(decodeState(parsed, SECRET)).toEqual(state);
  });

  it('writes plaintext when no secret is configured', () => {
    const stored = encodeState(state, null);
    const parsed = JSON.parse(stored);
    expect(isEnvelope(parsed)).toBe(false);
    expect(decodeState(parsed, null)).toEqual(state);
  });

  it('reads legacy plaintext even when a secret IS configured', () => {
    const plain = JSON.parse(JSON.stringify(state));
    expect(decodeState(plain, SECRET)).toEqual(state);
  });

  it('returns null for an envelope with the wrong secret', () => {
    const stored = JSON.parse(encodeState(state, SECRET));
    expect(decodeState(stored, 'wrong-secret')).toBeNull();
    expect(decodeState(stored, null)).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { applySignSubmission } from '../api/share.js';

const req = { headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest' }, socket: {} };

const baseDoc = () => ({
  name: 'הסכם',
  status: 'sent',
  fields: [
    { id: 'f1', type: 'signature', assignee: 'them', page: 0, x: 1, y: 1, w: 10, h: 10, value: null },
    { id: 'f2', type: 'text', assignee: 'me', page: 0, x: 1, y: 1, w: 10, h: 10, value: 'owner text' },
  ],
});

describe('applySignSubmission (restricted merge)', () => {
  it('fills only the signer fields and stamps an audit event', () => {
    const submitted = {
      status: 'completed',
      signedBy: 'דני',
      fields: [
        { id: 'f1', value: 'data:image/png;base64,SIG' },
        { id: 'f2', value: 'HACKED' },              // owner field — must be ignored
      ],
    };
    const { doc, completed } = applySignSubmission(baseDoc(), submitted, req);
    expect(completed).toBe(true);
    expect(doc.status).toBe('completed');
    expect(doc.fields.find((f) => f.id === 'f1').value).toBe('data:image/png;base64,SIG');
    expect(doc.fields.find((f) => f.id === 'f2').value).toBe('owner text');
    expect(doc.audit).toHaveLength(1);
    expect(doc.audit[0]).toMatchObject({ type: 'signed', signedBy: 'דני', ip: '1.2.3.4', userAgent: 'vitest' });
    expect(doc.audit[0].contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cannot change structure, name, or emails', () => {
    const submitted = {
      status: 'completed',
      name: 'RENAMED',
      clientEmail: 'evil@example.com',
      fields: [
        { id: 'f1', value: 'sig' },
        { id: 'new-evil', type: 'text', assignee: 'them', value: 'injected' },
      ],
    };
    const { doc } = applySignSubmission(baseDoc(), submitted, req);
    expect(doc.name).toBe('הסכם');
    expect(doc.clientEmail).toBeUndefined();
    expect(doc.fields.find((f) => f.id === 'new-evil')).toBeUndefined();
  });

  it('allows the appended system completion stamp (sanitized)', () => {
    const submitted = {
      status: 'completed',
      fields: [
        { id: 'f1', value: 'sig' },
        { id: 'sysstamp-x', type: 'text', assignee: 'system', page: 0, x: 5, y: 5, w: 10, h: 5, value: 'נחתם דיגיטלית', extra: 'stripme' },
      ],
    };
    const { doc } = applySignSubmission(baseDoc(), submitted, req);
    const stamp = doc.fields.find((f) => f.id === 'sysstamp-x');
    expect(stamp).toBeTruthy();
    expect(stamp.extra).toBeUndefined();
  });

  it('rejects signing a completed or expired doc', () => {
    expect(applySignSubmission({ ...baseDoc(), status: 'completed' }, { status: 'completed' }, req).errorCode).toBe(409);
    expect(applySignSubmission({ ...baseDoc(), expiresAt: Date.now() - 1000 }, { status: 'completed' }, req).errorCode).toBe(410);
  });

  describe('multi-signer', () => {
    const multiDoc = () => ({
      name: 'הסכם',
      status: 'sent',
      signers: [
        { id: 's1', name: 'דניאל', email: 'd@x.com', order: 0, status: 'pending' },
        { id: 's2', name: 'מאיה', email: 'm@x.com', order: 1, status: 'pending' },
      ],
      fields: [
        { id: 'f1', type: 'signature', assignee: 'them', value: null },              // no signer → first
        { id: 'f2', type: 'signature', assignee: 'them', signer: 's2', value: null },
      ],
    });

    it('rejects an unknown signer', () => {
      expect(applySignSubmission(multiDoc(), { signerId: 'nope', fields: [] }, req).errorCode).toBe(403);
    });

    it('enforces signing order', () => {
      const res = applySignSubmission(multiDoc(), { signerId: 's2', fields: [{ id: 'f2', value: 'sig' }] }, req);
      expect(res.errorCode).toBe(409);
      expect(res.error).toBe('not_your_turn');
    });

    it('first signer fills only their fields; doc stays pending', () => {
      const res = applySignSubmission(multiDoc(), {
        signerId: 's1',
        fields: [{ id: 'f1', value: 'sig1' }, { id: 'f2', value: 'sneaky' }],
      }, req);
      expect(res.errorCode).toBeUndefined();
      expect(res.completed).toBe(false);
      expect(res.doc.fields.find((f) => f.id === 'f1').value).toBe('sig1');
      expect(res.doc.fields.find((f) => f.id === 'f2').value).toBe(null);
      expect(res.doc.signers.find((s) => s.id === 's1').status).toBe('signed');
      expect(res.doc.status).toBe('sent');
    });

    it('completes when the last signer signs, with per-signer audit', () => {
      const afterFirst = applySignSubmission(multiDoc(), { signerId: 's1', fields: [{ id: 'f1', value: 'sig1' }] }, req).doc;
      const res = applySignSubmission(afterFirst, { signerId: 's2', fields: [{ id: 'f2', value: 'sig2' }] }, req);
      expect(res.completed).toBe(true);
      expect(res.doc.status).toBe('completed');
      expect(res.doc.audit).toHaveLength(2);
      expect(res.doc.audit.map((a) => a.signerId)).toEqual(['s1', 's2']);
    });

    it('a signer cannot sign twice', () => {
      const afterFirst = applySignSubmission(multiDoc(), { signerId: 's1', fields: [{ id: 'f1', value: 'sig1' }] }, req).doc;
      expect(applySignSubmission(afterFirst, { signerId: 's1', fields: [] }, req).errorCode).toBe(409);
    });
  });
});

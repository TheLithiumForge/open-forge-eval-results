import { describe, expect, it } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

const base = {
  version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
  moves: 0, elapsedMs: 0, started: false,
};

describe('untrusted snapshot validation', () => {
  it.each([
    null, [], 1, true, 'text', {}, { ...base, extra: 1 }, { ...base, version: 2 },
    { ...base, boardCode: ' np1-4-1' }, { ...base, boardCode: 1 },
    { ...base, matched: [0] }, { ...base, matched: [0, 1] },
    { ...base, matched: [0, 11, 0, 11] }, { ...base, matched: [0, 16] },
    { ...base, matched: [-1, 11] }, { ...base, matched: ['0', 11] },
    { ...base, matched: {} }, { ...base, selection: null },
    { ...base, selection: { kind: 'closed', index: 0 } },
    { ...base, selection: { kind: 'one' } }, { ...base, selection: { kind: 'other' } },
    { ...base, moves: -1 }, { ...base, moves: 0.5 }, { ...base, moves: 1000000 },
    { ...base, elapsedMs: -1 }, { ...base, elapsedMs: 0.5 },
    { ...base, elapsedMs: 360000000 }, { ...base, started: 1 },
    { ...base, started: true }, { ...base, elapsedMs: 1 }, { ...base, moves: 1 },
    { ...base, started: false, selection: { kind: 'one', index: 0 } },
    { ...base, moves: Number.MAX_SAFE_INTEGER + 1 }, { ...base, elapsedMs: '1' },
  ])('rejects inconsistent fields: %j', (value) => {
    expect(decodeSnapshot(JSON.stringify(value))).toBeNull();
  });

  it.each([
    { kind: 'one', index: 0 }, { kind: 'one', index: 16 }, { kind: 'one', index: -1 },
    { kind: 'one', index: 1.5 }, { kind: 'one', index: '1' },
    { kind: 'one', index: 1, extra: true },
    { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 },
    { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 },
    { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 },
    { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 },
    { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 },
    { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 },
    { kind: 'mismatch', first: 1, second: 2, remainingMs: 300, extra: true },
  ])('rejects invalid pending selection: %j', (selection) => {
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [0, 11], selection,
      moves: 2, started: true }))).toBeNull();
  });

  it('requires enough moves for pairs and a pending mismatch', () => {
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [0, 11], started: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [0, 11], started: true,
      moves: 1, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1 } }))).toBeNull();
  });

  it('requires completed snapshots to have a closed selection', () => {
    const complete = { ...base, matched: Array.from({ length: 16 }, (_, index) => index),
      started: true, moves: 8 };
    expect(decodeSnapshot(JSON.stringify(complete))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...complete, selection: { kind: 'one', index: 0 } })))
      .toBeNull();
  });

  it('rejects missing fields and malformed JSON', () => {
    const { elapsedMs, ...missing } = base;
    expect(elapsedMs).toBe(0);
    expect(decodeSnapshot(JSON.stringify(missing))).toBeNull();
    expect(decodeSnapshot('{')).toBeNull();
  });
});

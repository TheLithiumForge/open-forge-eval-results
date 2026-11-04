import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { activateCard, advanceGame, createGame } from './state.ts';

const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };

describe('snapshot validation', () => {
  it('round trips the example and every selection kind', () => {
    const state = decodeSnapshot(JSON.stringify(example));
    if (!state) throw new Error('Example must decode');
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    const closed = advanceGame(state, 300);
    expect(decodeSnapshot(encodeSnapshot(closed))).toEqual(closed);
    const one = activateCard(closed, 3);
    expect(decodeSnapshot(encodeSnapshot(one))).toEqual(one);
    const fresh = createGame('np1-4-1');
    if (!fresh) throw new Error('Test code');
    expect(decodeSnapshot(encodeSnapshot(fresh))).toEqual(fresh);
  });
  it.each([
    { version: 2 }, { extra: true }, { boardCode: ' np1-4-1 ' },
    { matched: [0] }, { matched: [0, 0] }, { matched: [0, 1] }, { matched: [-1, 11] },
    { matched: [0, 11, 16] }, { moves: 1 }, { moves: 1000000 }, { moves: -1 }, { moves: 1.5 },
    { elapsedMs: 360000000 }, { elapsedMs: -1 }, { elapsedMs: 0.5 }, { started: 1 }, { started: false },
    { selection: { kind: 'closed', extra: 0 } }, { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'one', index: 2, extra: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 1 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 1 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { selection: { kind: 'invalid' } },
  ])('rejects inconsistent or unknown data: %j', patch => {
    expect(decodeSnapshot(JSON.stringify({ ...example, ...patch }))).toBeNull();
  });
  it('requires all fields, rejects malformed input, and enforces UTF-8 bytes', () => {
    for (const text of ['{}', '[]', 'null', '"text"', '{', ' '.repeat(65537),
      '"' + 'é'.repeat(32768) + '"']) expect(decodeSnapshot(text)).toBeNull();
  });
  it('checks unstarted and started-zero-move consistency without inventing history', () => {
    const base = { ...example, matched: [], moves: 0, elapsedMs: 0, selection: { kind: 'closed' }, started: false };
    expect(decodeSnapshot(JSON.stringify(base))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, started: true }))).toBeNull();
    const one = { ...base, selection: { kind: 'one', index: 0 } };
    expect(decodeSnapshot(JSON.stringify(one))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...one, started: true }))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, elapsedMs: 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, started: true, moves: 999999, elapsedMs: 359999999 }))).not.toBeNull();
  });
  it('accepts completed snapshots and derives victory', () => {
    const completed = { ...example, matched: Array.from({ length: 16 }, (_, i) => i),
      selection: { kind: 'closed' }, moves: 8 };
    expect(decodeSnapshot(JSON.stringify(completed))?.matched).toHaveLength(16);
  });
});

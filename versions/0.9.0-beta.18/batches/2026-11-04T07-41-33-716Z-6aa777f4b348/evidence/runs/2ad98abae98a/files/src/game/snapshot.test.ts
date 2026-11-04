import { describe, expect, it } from 'vitest';
import { createGame } from './deal.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { activateCard, advanceGame } from './transitions.ts';

const sample = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
describe('snapshot boundary', () => {
  it('restores the documented example and round trips every turn state', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Missing game');
    const one = activateCard(initial, 0);
    const miss = activateCard(one, 1);
    for (const state of [initial, one, miss, advanceGame(miss, 800), activateCard(one, 11)]) {
      expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
    const restored = decodeSnapshot(JSON.stringify(sample));
    expect(restored?.matched).toEqual([0, 11]);
    expect(restored?.selection).toEqual(sample.selection);
  });
  it.each([
    { extra: 1 }, { version: 2 }, { boardCode: 'np1-4-01' },
    { matched: [0] }, { matched: [0, 0] }, { matched: [0, 1] }, { matched: [-1, 11] },
    { matched: [16, 11] }, { matched: ['0', 11] }, { matched: null },
    { selection: { kind: 'closed', index: 3 } }, { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'unknown' } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { moves: 1 }, { moves: 1000000 }, { moves: -1 }, { moves: 2.5 },
    { elapsedMs: 360000000 }, { elapsedMs: -1 }, { elapsedMs: 1.5 },
    { started: false }, { started: 'true' },
  ])('rejects inconsistent or unknown fields: %j', patch => {
    expect(decodeSnapshot(JSON.stringify({ ...sample, ...patch }))).toBeNull();
  });
  it('enforces started state without reconstructing history', () => {
    const hidden = { ...sample, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
    expect(decodeSnapshot(JSON.stringify(hidden))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...hidden, started: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...hidden, selection: { kind: 'one', index: 3 } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...hidden, started: true, selection: { kind: 'one', index: 3 } }))).not.toBeNull();
  });
  it('accepts complete progress with closed selection and sufficient moves', () => {
    const complete = { ...sample, matched: Array.from({ length: 16 }, (_, i) => i), selection: { kind: 'closed' }, moves: 8 };
    expect(decodeSnapshot(JSON.stringify(complete))?.matched).toHaveLength(16);
    expect(decodeSnapshot(JSON.stringify({ ...complete, moves: 7 }))).toBeNull();
  });
  it('enforces UTF-8 bytes, malformed input and the exact size boundary', () => {
    const text = JSON.stringify(sample);
    expect(decodeSnapshot(text + ' '.repeat(65536 - text.length))).not.toBeNull();
    expect(decodeSnapshot(text + ' '.repeat(65537 - text.length))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...sample, extra: 'é'.repeat(33000) }))).toBeNull();
    for (const text of ['', '{', 'null', '[]', '{}']) expect(decodeSnapshot(text)).toBeNull();
  });
  it('exports whole milliseconds and a positive mismatch interval', () => {
    const restored = decodeSnapshot(JSON.stringify(sample));
    if (!restored) throw new Error('Missing sample');
    const text = encodeSnapshot(advanceGame(restored, 299.75));
    expect(decodeSnapshot(text)?.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
    expect(decodeSnapshot(text)?.elapsedMs).toBe(1799);
  });
});

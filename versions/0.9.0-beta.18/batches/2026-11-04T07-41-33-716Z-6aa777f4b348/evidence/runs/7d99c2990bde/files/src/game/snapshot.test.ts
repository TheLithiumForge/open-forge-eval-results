import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { activateCard, advanceGame, createGame, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';

const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (value: unknown) => decodeSnapshot(JSON.stringify(value));

describe('version 1 snapshots', () => {
  it('round trips the documented mismatch and starting state', () => {
    const restored = decode(example);
    expect(restored?.selection).toEqual(example.selection);
    if (!restored) throw new Error('Expected example snapshot');
    expect(JSON.parse(encodeSnapshot(restored))).toEqual(example);
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Expected initial state');
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
  });

  it('exports whole elapsed and pending milliseconds without exporting zero remaining', () => {
    const state = createGame('np1-4-1');
    if (!state) throw new Error('Expected state');
    const miss = advanceGame(activateCard(activateCard(state, 0), 1), 799.75);
    expect(decodeSnapshot(encodeSnapshot(miss))?.selection).toEqual({
      kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(decodeSnapshot(encodeSnapshot(miss))?.elapsedMs).toBe(799);
  });

  it('accepts stated invariants without reconstructing play history', () => {
    expect(decode({ ...example, moves: MAX_MOVES, elapsedMs: 0 })).not.toBeNull();
    expect(decode({ ...example, matched: [11, 0], elapsedMs: MAX_ELAPSED_MS })).not.toBeNull();
    expect(decode({ ...example, matched: [], selection: { kind: 'closed' }, moves: 1 })).not.toBeNull();
    expect(decode({ ...example, matched: [], selection: { kind: 'one', index: 2 }, moves: 0 })).not.toBeNull();
  });

  it.each([
    { ...example, unknown: 1 }, { ...example, version: 2 }, { ...example, boardCode: 'np1-4-01' },
    { ...example, matched: [0] }, { ...example, matched: [0, 0] }, { ...example, matched: [0, 1] },
    { ...example, matched: [-1, 11] }, { ...example, matched: [0, 16] },
    { ...example, selection: { kind: 'closed', index: 1 } },
    { ...example, selection: { kind: 'one', index: 0 } },
    { ...example, selection: { kind: 'one', index: 16 } },
    { ...example, selection: { kind: 'one', index: 1, extra: true } },
    { ...example, selection: { kind: 'other' } },
    { ...example, selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { ...example, selection: { kind: 'mismatch', first: 4, second: 5, remainingMs: 300 } },
    { ...example, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { ...example, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { ...example, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { ...example, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1, extra: 0 } },
    { ...example, moves: 1 }, { ...example, moves: MAX_MOVES + 1 }, { ...example, moves: -1 },
    { ...example, moves: 2.5 }, { ...example, elapsedMs: MAX_ELAPSED_MS + 1 },
    { ...example, elapsedMs: -1 }, { ...example, elapsedMs: 0.5 },
    { ...example, started: false }, { ...example, started: 1 },
    { ...example, matched: [], selection: { kind: 'closed' }, moves: 0 },
  ])('rejects invalid documented invariant: %j', value => expect(decode(value)).toBeNull());

  it('rejects missing fields, malformed JSON and UTF-8 byte overflow', () => {
    for (const key of Object.keys(example)) {
      const copy: Record<string, unknown> = { ...example };
      delete copy[key];
      expect(decode(copy)).toBeNull();
    }
    for (const text of ['{', 'null', '[]', 'true', '"text"']) expect(decodeSnapshot(text)).toBeNull();
    const base = JSON.stringify(example);
    expect(decodeSnapshot(base + ' '.repeat(SNAPSHOT_BYTE_LIMIT - base.length))).not.toBeNull();
    expect(decodeSnapshot(base + ' '.repeat(SNAPSHOT_BYTE_LIMIT - base.length + 1))).toBeNull();
    expect(decodeSnapshot(' '.repeat(40000) + base.replace('np1-4-1', 'é'.repeat(20000)))).toBeNull();
  });
});

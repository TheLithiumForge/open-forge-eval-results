import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { activateCard, advanceGame, createGame, isWon } from './state.ts';

const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
  moves: 0, elapsedMs: 0, started: false };
const pending = { ...base, matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };

describe('version 1 snapshots', () => {
  it('restores the documented snapshot and round trips all selection states', () => {
    const restored = decodeSnapshot(JSON.stringify(pending));
    expect(restored?.matched).toEqual([0, 11]);
    expect(restored?.selection).toEqual(pending.selection);
    const game = createGame('np1-4-1');
    if (game === null) throw new Error('Invalid test code.');
    const one = activateCard(game, 0);
    const mismatch = activateCard(one, 1);
    for (const state of [game, one, mismatch, activateCard(one, 11)]) {
      expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
  });

  it('exports whole ms with a pending interval of at least one', () => {
    const game = createGame('np1-4-1');
    if (game === null) throw new Error('Invalid test code.');
    const state = advanceGame(activateCard(activateCard(game, 0), 1), 799.75);
    const restored = decodeSnapshot(encodeSnapshot(state));
    expect(restored?.elapsedMs).toBe(799);
    expect(restored?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(state.elapsedMs).toBe(799.75);
  });

  it('accepts completion, boundaries and stated consistency without invented history checks', () => {
    const complete = { ...base, matched: Array.from({ length: 16 }, (_, index) => index), moves: 8, started: true };
    const restored = decodeSnapshot(JSON.stringify(complete));
    expect(restored !== null && isWon(restored)).toBe(true);
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: 999999, elapsedMs: 359999999, started: true }))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: 1, elapsedMs: 0, started: true }))).not.toBeNull();
  });

  it.each([
    { ...base, extra: true }, { ...base, version: 2 }, { ...base, boardCode: ' np1-4-1' },
    { ...base, matched: [0] }, { ...pending, matched: [0, 1] }, { ...pending, matched: [0, 11, 0] },
    { ...pending, matched: [0, 16] }, { ...pending, matched: [0, 0.5] },
    { ...pending, selection: { kind: 'one', index: 0 } },
    { ...pending, selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { ...pending, selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { ...pending, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { ...pending, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { ...pending, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0.5 } },
    { ...base, selection: { kind: 'closed', index: 0 } },
    { ...base, selection: { kind: 'unknown' } }, { ...pending, moves: 1 },
    { ...base, started: true }, { ...base, moves: 1 }, { ...base, elapsedMs: 1 },
    { ...base, started: 1 }, { ...base, moves: -1 }, { ...base, moves: 0.5 },
    { ...base, moves: 1000000 }, { ...base, elapsedMs: 360000000 },
    { ...base, elapsedMs: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects inconsistent snapshot %#', (value) => {
    expect(decodeSnapshot(JSON.stringify(value))).toBeNull();
  });

  it('rejects missing fields, malformed JSON and primitives; enforces byte size', () => {
    for (const text of ['{', 'null', '[]', '1', '{}', JSON.stringify({ ...base, started: undefined })]) {
      expect(decodeSnapshot(text)).toBeNull();
    }
    const text = JSON.stringify(base);
    expect(decodeSnapshot(' '.repeat(SNAPSHOT_MAX_BYTES - text.length) + text)).not.toBeNull();
    expect(decodeSnapshot(' '.repeat(SNAPSHOT_MAX_BYTES - text.length + 1) + text)).toBeNull();
    expect(decodeSnapshot(`"${'é'.repeat(32768)}"`)).toBeNull();
  });
});

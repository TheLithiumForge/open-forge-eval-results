import { describe, expect, it } from 'vitest';
import { activateCard } from './activate-card.ts';
import { advanceGame } from './advance-game.ts';
import { createGame } from './create-game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';

const snapshot = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};

it('loads the documented snapshot and round trips it', () => {
  const state = decodeSnapshot(JSON.stringify(snapshot));
  expect(state?.matched).toEqual([0, 11]);
  expect(state?.selection).toEqual(snapshot.selection);
  if (state === null) throw new Error('Invalid fixture');
  expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
});

it('exports whole milliseconds, preserving at least one pending millisecond', () => {
  const initial = createGame('np1-4-1');
  if (initial === null) throw new Error('Invalid fixture');
  const state = advanceGame(activateCard(activateCard(initial, 0), 1), 799.5);
  const restored = decodeSnapshot(encodeSnapshot(state));
  expect(restored?.elapsedMs).toBe(799);
  expect(restored?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  expect(state.elapsedMs).toBe(799.5);
});

const invalid: unknown[] = [
  null, [], {}, { ...snapshot, extra: true }, { ...snapshot, version: 2 },
  { ...snapshot, boardCode: 'np1-4-1\n' }, { ...snapshot, moves: -1 }, { ...snapshot, moves: 1.5 },
  { ...snapshot, moves: 1000000 }, { ...snapshot, elapsedMs: 360000000 },
  { ...snapshot, elapsedMs: Number.MAX_SAFE_INTEGER + 1 }, { ...snapshot, started: 'true' },
  { ...snapshot, matched: [0] }, { ...snapshot, matched: [0, 1] },
  { ...snapshot, matched: [0, 11, 0, 11] }, { ...snapshot, matched: [0, 16] },
  { ...snapshot, matched: ['0', 11] }, { ...snapshot, moves: 1 },
  { ...snapshot, selection: { kind: 'closed', index: 1 } },
  { ...snapshot, selection: { kind: 'one', index: 0 } },
  { ...snapshot, selection: { kind: 'one', index: 16 } },
  { ...snapshot, selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
  { ...snapshot, selection: { kind: 'mismatch', first: 4, second: 5, remainingMs: 300 } },
  { ...snapshot, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
  { ...snapshot, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
  { ...snapshot, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
  { ...snapshot, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300, extra: 1 } },
  { ...snapshot, selection: { kind: 'other' } }, { ...snapshot, started: false },
  { ...snapshot, moves: 0, matched: [], selection: { kind: 'closed' } },
];

describe('complete snapshot validation', () => {
  for (const [index, value] of invalid.entries()) {
    it(`rejects inconsistent or unknown data ${index}`, () => expect(decodeSnapshot(JSON.stringify(value))).toBeNull());
  }
  it('rejects malformed, missing-key and oversized UTF-8 input', () => {
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...snapshot, started: undefined }))).toBeNull();
    expect(decodeSnapshot(` ${' '.repeat(SNAPSHOT_BYTE_LIMIT)}${JSON.stringify(snapshot)}`)).toBeNull();
    expect(decodeSnapshot(` ${'é'.repeat(SNAPSHOT_BYTE_LIMIT / 2)}${JSON.stringify(snapshot)}`)).toBeNull();
  });
});

it('accepts initial, one-card, capped and completed states without reconstructing history', () => {
  const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
  expect(decodeSnapshot(JSON.stringify(base))).not.toBeNull();
  expect(decodeSnapshot(JSON.stringify({ ...base, started: true, selection: { kind: 'one', index: 0 } }))).not.toBeNull();
  expect(decodeSnapshot(JSON.stringify({ ...snapshot, moves: 999999, elapsedMs: 359999999 }))).not.toBeNull();
  expect(decodeSnapshot(JSON.stringify({ ...base, started: true, moves: 8,
    matched: Array.from({ length: 16 }, (_, i) => i) }))).not.toBeNull();
  // D07 permits an active game with any positive move history and no current matches.
  expect(decodeSnapshot(JSON.stringify({ ...base, started: true, moves: 1 }))).not.toBeNull();
});

import { expect, test } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTES } from './snapshot.ts';
import { activateCard, createGame, MAX_ELAPSED, MAX_MOVES } from './state.ts';

const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
const progress = { ...base, matched: [0, 11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true };
test('round trips fresh, one-card, matched and mismatch progress', () => {
  const start = createGame('np1-4-1');
  if (!start) throw new Error('Fixture');
  for (const state of [start, activateCard(start, 0), activateCard(activateCard(start, 0), 11)]) {
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  }
  const restored = decodeSnapshot(JSON.stringify(progress));
  expect(restored?.matched).toEqual([0, 11]);
  expect(restored?.selection).toEqual(progress.selection);
  expect(restored && decodeSnapshot(encodeSnapshot(restored))).toEqual(restored);
});
test.each([
  { extra: 1 }, { version: 2 }, { boardCode: 'np1-4-01' }, { started: 1 }, { moves: -1 }, { moves: 0.5 },
  { moves: MAX_MOVES + 1 }, { elapsedMs: MAX_ELAPSED + 1 }, { elapsedMs: 0.5 }, { matched: [0] },
  { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 16] }, { matched: [0, 11], moves: 0 },
  { selection: { kind: 'closed', index: 0 } }, { selection: { kind: 'unknown' } },
  { selection: { kind: 'one', index: 0 } }, { started: true }, { started: false, moves: 1 },
])('rejects inconsistent base fields %j', change => {
  expect(decodeSnapshot(JSON.stringify({ ...base, ...change }))).toBeNull();
});
test.each([
  { first: 0, second: 2, remainingMs: 300 }, { first: 1, second: 1, remainingMs: 300 },
  { first: 4, second: 5, remainingMs: 300 }, { first: 1, second: 2, remainingMs: 0 },
  { first: 1, second: 2, remainingMs: 801 }, { first: 1, second: 2, remainingMs: 1.5 },
  { first: 1, second: 2, remainingMs: 300, other: true },
])('rejects inconsistent mismatch %j', selection => {
  expect(decodeSnapshot(JSON.stringify({ ...progress, selection: { kind: 'mismatch', ...selection } }))).toBeNull();
});
test('validates move accounting and limits without reconstructing history', () => {
  expect(decodeSnapshot(JSON.stringify({ ...progress, moves: 1 }))).toBeNull();
  expect(decodeSnapshot(JSON.stringify({ ...progress, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED }))).not.toBeNull();
  const completed = { ...base, matched: Array.from({ length: 16 }, (_, i) => i), moves: 8, started: true };
  expect(decodeSnapshot(JSON.stringify(completed))).not.toBeNull();
});
test('rejects malformed, extra, missing, wrong-type and oversized UTF-8 data', () => {
  for (const text of ['', 'null', '[]', '{}', '{', JSON.stringify({ ...base, moves: null }),
    JSON.stringify({ ...base, matched: '0,11' }), JSON.stringify(base).replace('"started":false', '"started":null'),
    ' '.repeat(SNAPSHOT_BYTES) + JSON.stringify(base), 'é'.repeat(SNAPSHOT_BYTES / 2) + JSON.stringify(base)]) {
    expect(decodeSnapshot(text)).toBeNull();
  }
});

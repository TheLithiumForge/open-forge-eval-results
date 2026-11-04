import { describe, expect, it } from 'vitest';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { activateCard, advanceGame, MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';

function fresh(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Invalid test game');
  return state;
}
const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
const decode = (patch: Record<string, unknown>) => decodeSnapshot(JSON.stringify({ ...base, ...patch }));

describe('snapshots', () => {
  it('round trips fresh, one card, matched and mismatch progress', () => {
    const first = activateCard(fresh(), 0);
    const match = activateCard(first, 11);
    const mismatch = advanceGame(activateCard(activateCard(match, 1), 2), 500);
    for (const state of [fresh(), first, match, mismatch]) expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    expect(mismatch.selection).toMatchObject({ kind: 'mismatch', remainingMs: 300 });
  });
  it('exports whole milliseconds with at least one pending millisecond', () => {
    const state = advanceGame(activateCard(activateCard(fresh(), 0), 1), 799.8);
    const restored = decodeSnapshot(encodeSnapshot(state));
    expect(restored).toMatchObject({ elapsedMs: 799, selection: { kind: 'mismatch', remainingMs: 1 } });
  });
  it('accepts consistent progress without reconstructing a history', () => {
    expect(decode({ started: true, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS })).not.toBeNull();
    expect(decode({ started: true, moves: 1, selection: { kind: 'one', index: 2 } })).not.toBeNull();
    expect(decode({ started: true, moves: 8, matched: Array.from({ length: 16 }, (_, i) => i) })).not.toBeNull();
  });
  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-1\n' }, { boardCode: 4 }, { started: 1 },
    { moves: -1 }, { moves: 0.5 }, { moves: MAX_MOVES + 1 }, { elapsedMs: MAX_ELAPSED_MS + 1 },
    { elapsedMs: 1 }, { moves: 1 }, { started: true }, { matched: [0] }, { matched: [0, 1] },
    { matched: [0, 11, 0, 11] }, { matched: [-1, 11] }, { matched: [0, 16] }, { matched: 'bad' },
    { started: true, moves: 0, matched: [0, 11], selection: { kind: 'one', index: 1 } },
    { started: true, moves: 1, matched: [0, 11], selection: { kind: 'one', index: 0 } },
    { started: true, moves: 1, selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'closed', extra: true } }, { selection: null }, { selection: { kind: 'unknown' } },
    { started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 1 } },
    { started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 0, remainingMs: 1 } },
    { started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 } },
    { started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 801 } },
    { started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0.5 } },
    { started: true, moves: 1, matched: [0, 11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 800 } },
  ])('rejects inconsistent input %j', (patch) => expect(decode(patch)).toBeNull());
  it('rejects malformed JSON, missing fields, and excessive UTF-8 bytes', () => {
    for (const text of ['{', 'null', '[]', '{}', encodeSnapshot(fresh()).replace('"version": 1,', '')]) expect(decodeSnapshot(text)).toBeNull();
    expect(decodeSnapshot(' '.repeat(65536) + JSON.stringify(base))).toBeNull();
    expect(decodeSnapshot(' '.repeat(65536 - 2) + '"é"')).toBeNull();
  });
});

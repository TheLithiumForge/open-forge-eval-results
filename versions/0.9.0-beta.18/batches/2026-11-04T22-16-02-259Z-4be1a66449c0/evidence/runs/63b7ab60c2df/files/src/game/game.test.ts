import { describe, expect, it } from 'vitest';
import { createGame, activateCard, advanceGame, isWon, MAX_ELAPSED, MAX_MOVES } from './game.ts';
import { parseBoardCode, SIZES } from './deck.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { replayGame } from './replay.ts';
function game() { const state = createGame('np1-4-1'); if (!state) throw Error('fixture'); return state; }
describe('deals and turns', () => {
  it('matches the published independent deck vector and validates codes', () => {
    expect(game().deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    for (const code of ['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', ' np1-4-1']) expect(parseBoardCode(code)).toBeNull();
    for (const size of SIZES) { const g = createGame(`np1-${size}-2147483646`); expect(g?.deck.length).toBe(size * size); expect(new Set(g?.deck).size).toBe(size * size / 2); }
  });
  it('handles ignored reveals, mismatch boundary, match, and caps', () => {
    let g = activateCard(game(), 0); expect(activateCard(g, 0)).toBe(g);
    g = activateCard(g, 1); expect(g.moves).toBe(1); expect(activateCard(g, 11)).toBe(g);
    g = advanceGame(g, 799); expect(g.selection.kind).toBe('mismatch'); g = advanceGame(g, 1); expect(g.selection.kind).toBe('closed');
    g = activateCard(activateCard(g, 0), 11); expect(g.matched).toEqual([0, 11]); expect(g.moves).toBe(2);
    g = { ...g, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED - 1 }; g = advanceGame(g, 100); expect(g.elapsedMs).toBe(MAX_ELAPSED);
    g = activateCard(activateCard(g, 2), 6); expect(g.moves).toBe(MAX_MOVES);
  });
  it('finishes every size with one move per pair', () => {
    for (const size of SIZES) { let g = createGame(`np1-${size}-1`); if (!g) throw Error(); for (let face = 0; face < size * size / 2; face++) { const indices = g.deck.flatMap((value, index) => value === face ? [index] : []); g = activateCard(activateCard(g, indices[0]!), indices[1]!); } expect(isWon(g)).toBe(true); expect(g.moves).toBe(size * size / 2); }
  });
});
describe('formats', () => {
  it('round trips pending progress and rejects inconsistent snapshots', () => {
    const state = advanceGame(activateCard(activateCard(activateCard(activateCard(game(), 0), 11), 1), 2), 500);
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    const base = JSON.parse(encodeSnapshot(state));
    for (const changed of [{ extra: 1 }, { matched: [0] }, { moves: 1 }, { started: false }, { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } }]) expect(decodeSnapshot(JSON.stringify({ ...base, ...changed }))).toBeNull();
    expect(decodeSnapshot(' '.repeat(65537))).toBeNull();
  });
  it('replays equal-time actions and resolves the exact mismatch boundary', () => {
    const replay = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 0 }, { atMs: 800, index: 11 }], endMs: 800 };
    const result = replayGame(JSON.stringify(replay)); expect(result?.matched).toEqual([0, 11]); expect(result?.moves).toBe(2); expect(result?.elapsedMs).toBe(800);
    expect(replayGame(JSON.stringify({ ...replay, endMs: 799 }))).toBeNull(); expect(replayGame(JSON.stringify({ ...replay, extra: 1 }))).toBeNull();
    expect(replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }))?.elapsedMs).toBe(800);
  });
});

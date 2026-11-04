import { describe, expect, it } from 'vitest';
import { parseBoard, SIZES } from './deck.ts';
import { activateCard, advanceGame, createGame, isWon, MAX_MOVES, MAX_TIME } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { replayGame } from './replay.ts';
const initial = () => { const game = createGame('np1-4-1'); if (!game) throw new Error('board'); return game; };
describe('deal and turns', () => {
  it('uses the published literal vector and validates codes', () => {
    expect(parseBoard('np1-4-1')?.deck).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]);
    for (const code of ['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', ' np1-4-1', 'np2-4-1']) expect(parseBoard(code)).toBeNull();
    for (const size of SIZES) { const deck = parseBoard(`np1-${size}-2147483646`)?.deck; expect(deck?.length).toBe(size * size); expect(new Set(deck).size).toBe(size * size / 2); }
  });
  it('ignores duplicate and blocked actions, closes at 800ms and matches', () => {
    let game = activateCard(initial(), 0);
    expect(activateCard(game, 0)).toBe(game);
    game = activateCard(game, 1); expect(game.moves).toBe(1);
    expect(activateCard(game, 11)).toBe(game);
    game = advanceGame(game, 799); expect(game.selection.kind).toBe('mismatch');
    game = advanceGame(game, 1); expect(game.selection.kind).toBe('closed');
    game = activateCard(activateCard(game, 0), 11); expect(game.matched).toEqual([0, 11]); expect(game.moves).toBe(2);
  });
  it('caps time and moves while continuing play', () => {
    let game = { ...initial(), moves: MAX_MOVES, elapsedMs: MAX_TIME, started: true };
    game = activateCard(activateCard(game, 0), 11); expect(game.moves).toBe(MAX_MOVES); expect(advanceGame(game, 100).elapsedMs).toBe(MAX_TIME);
  });
  it('completes every size', () => {
    for (const size of SIZES) {
      let game = createGame(`np1-${size}-1`); if (!game) throw new Error('board');
      for (let face = 0; face < size * size / 2; face++) { const indices = game.board.deck.flatMap((n, i) => n === face ? [i] : []); const [a,b] = indices; if (a === undefined || b === undefined) throw new Error('pair'); game = activateCard(activateCard(game, a), b); }
      expect(isWon(game)).toBe(true); expect(game.moves).toBe(size * size / 2);
    }
  });
});
describe('snapshots and replay', () => {
  it('round trips a pending mismatch and rejects invalid state', () => {
    const game = advanceGame(activateCard(activateCard(initial(), 0), 1), 500);
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    for (const patch of [{ extra: 1 }, { matched: [0] }, { moves: 0 }, { selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 3 } }, { elapsedMs: MAX_TIME + 1 }]) {
      const raw: unknown = JSON.parse(encodeSnapshot(game)); expect(decodeSnapshot(JSON.stringify({ ...raw as object, ...patch }))).toBeNull();
    }
  });
  it('replays the example and resolves timeout at the action timestamp', () => {
    const example = replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{atMs:0,index:0},{atMs:0,index:11}], endMs:800 }));
    expect(example?.matched).toEqual([0,11]); expect(example?.elapsedMs).toBe(800);
    const boundary = replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:2}], endMs:800 }));
    expect(boundary?.selection).toEqual({kind:'one',index:2});
    expect(replayGame('{"version":1}')).toBeNull();
  });
});

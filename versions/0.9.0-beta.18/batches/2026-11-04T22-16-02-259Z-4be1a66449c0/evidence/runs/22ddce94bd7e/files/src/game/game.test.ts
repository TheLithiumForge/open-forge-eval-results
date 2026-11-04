import { describe, expect, it } from 'vitest';
import { makeDeck, parseBoardCode, SIZES } from './deck.ts';
import { activateCard, advanceGame, createGame, isWon, MAX_TIME } from './state.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { replayGame } from './replay.ts';
const initial = () => { const game = createGame('np1-4-1'); if (!game) throw Error('fixture'); return game; };
describe('deals', () => {
  it('matches the independent specification vector', () => {
    expect(makeDeck(4, 1)).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]);
  });
  it('accepts only canonical codes', () => {
    for (const code of ['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', ' np1-4-1', 'np2-4-1']) expect(parseBoardCode(code)).toBeNull();
    expect(parseBoardCode('np1-16-2147483646')).toEqual({ size: 16, seed: 2147483646 });
  });
});
describe('turns and time', () => {
  it('ignores repeated and matched cards, and resolves mismatch at 800ms', () => {
    let game = activateCard(initial(), 0);
    expect(activateCard(game, 0)).toBe(game);
    game = activateCard(game, 11);
    expect(game.moves).toBe(1); expect(game.matched).toEqual([0, 11]);
    expect(activateCard(game, 0)).toBe(game);
    game = activateCard(activateCard(game, 1), 2);
    expect(activateCard(game, 3)).toBe(game);
    game = advanceGame(game, 799); expect(game.selection.kind).toBe('mismatch');
    game = advanceGame(game, 1); expect(game.selection.kind).toBe('closed');
  });
  it('finishes each supported size with every pair exactly once', () => {
    for (const size of SIZES) {
      let game = createGame(`np1-${size}-1`);
      if (!game) throw Error('fixture');
      for (let face = 0; face < size * size / 2; face++) {
        const first = game.deck.indexOf(face), second = game.deck.lastIndexOf(face);
        game = activateCard(activateCard(game, first), second);
      }
      expect(isWon(game)).toBe(true);
      expect(game.moves).toBe(size * size / 2);
    }
  });
  it('finishes and stops time', () => {
    let game = initial();
    for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) {
      if (a === undefined || b === undefined) throw Error('fixture');
      game = activateCard(activateCard(game, a), b);
    }
    expect(isWon(game)).toBe(true); expect(game.moves).toBe(8);
    expect(advanceGame(game, 1000).elapsedMs).toBe(0);
  });
});
describe('snapshots and replay', () => {
  it('round trips pending mismatches and rejects inconsistent data', () => {
    const state = advanceGame(activateCard(activateCard(activateCard(activateCard(initial(), 0), 11), 1), 2), 500);
    const json = encodeSnapshot(state);
    expect(decodeSnapshot(json)).toEqual(state);
    const data = JSON.parse(json); data.matched = [0];
    expect(decodeSnapshot(JSON.stringify(data))).toBeNull();
    data.matched = [0,11]; data.extra = true;
    expect(decodeSnapshot(JSON.stringify(data))).toBeNull();
  });
  it('replays the example and resolves a timeout before an equal-time action', () => {
    const replay = (actions: { atMs: number; index: number }[], endMs: number) => replayGame(JSON.stringify({version: 1, boardCode: 'np1-4-1', actions, endMs}));
    expect(replay([{atMs:0,index:0},{atMs:0,index:11}],800)).toMatchObject({moves:1, elapsedMs:800, matched:[0,11]});
    expect(replay([{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:2}],800)?.selection).toEqual({kind:'one',index:2});
    expect(replay([{atMs:0,index:0}],Number.MAX_SAFE_INTEGER)?.elapsedMs).toBe(MAX_TIME);
    expect(replay([{atMs:2,index:0},{atMs:1,index:1}],2)).toBeNull();
  });
});

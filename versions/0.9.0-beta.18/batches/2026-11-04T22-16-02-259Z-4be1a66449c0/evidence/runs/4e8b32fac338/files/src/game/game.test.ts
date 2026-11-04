import { describe, expect, it } from 'vitest';
import { parseBoard } from './deck';
import { activateCard, advanceGame, createGame, isWon } from './game';
import { decodeSnapshot, encodeSnapshot } from './snapshot';
import { replayGame } from './replay';
function initial() { const game = createGame('np1-4-1'); if (!game) throw Error('bad fixture'); return game; }
describe('board generation', () => {
  it('matches the literal version 1 vector', () => {
    expect(parseBoard('np1-4-1')?.deck).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]);
    for (const code of ['np1-4-0','np1-04-1','np1-4-01','np1-4-2147483647',' np1-4-1']) expect(parseBoard(code)).toBeNull();
  });
});
describe('game', () => {
  it('ignores repeated cards and waits 800 active ms for a miss', () => {
    let game = activateCard(initial(), 0);
    expect(activateCard(game, 0)).toBe(game);
    game = activateCard(game, 1);
    expect(game.moves).toBe(1);
    expect(activateCard(game, 11)).toBe(game);
    game = advanceGame(game, 799);
    expect(game.selection.kind).toBe('mismatch');
    game = advanceGame(game, 1);
    expect(game.selection.kind).toBe('closed');
    game = activateCard(activateCard(game, 0), 11);
    expect(game.matched).toEqual([0,11]);
    expect(game.moves).toBe(2);
  });
  it('can finish every supported size', () => {
    for (const size of [4,6,8,10,12,14,16]) {
      let game = createGame(`np1-${size}-1`);
      if (!game) throw Error('bad board');
      for (let face = 0; face < size * size / 2; face++) {
        const first = game.board.deck.indexOf(face), second = game.board.deck.lastIndexOf(face);
        game = activateCard(activateCard(game, first), second);
      }
      expect(isWon(game)).toBe(true);
      expect(game.moves).toBe(size * size / 2);
    }
  });
  it('stops time when completed', () => {
    let game = initial();
    for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) {
      if (a === undefined || b === undefined) throw Error('bad pair');
      game = activateCard(activateCard(game, a), b);
    }
    expect(isWon(game)).toBe(true);
    expect(advanceGame(game, 1000)).toBe(game);
  });
});
describe('snapshots and replays', () => {
  it('round trips the illustrative snapshot and rejects inconsistent state', () => {
    const text = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
    const game = decodeSnapshot(text);
    expect(game).not.toBeNull();
    if (!game) throw Error('bad fixture');
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    expect(decodeSnapshot(text.replace('[0,11]','[0,1]'))).toBeNull();
    expect(decodeSnapshot(text.replace('"moves":2','"moves":1'))).toBeNull();
    expect(decodeSnapshot(text.replace('"version":1','"version":1,"extra":0'))).toBeNull();
  });
  it('resolves a timeout before an equal-time action', () => {
    const result = replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:2}],endMs:800}));
    expect(result?.selection).toEqual({kind:'one',index:2});
    expect(result?.elapsedMs).toBe(800);
    expect(replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:2,index:0},{atMs:1,index:1}],endMs:2}))).toBeNull();
  });
});

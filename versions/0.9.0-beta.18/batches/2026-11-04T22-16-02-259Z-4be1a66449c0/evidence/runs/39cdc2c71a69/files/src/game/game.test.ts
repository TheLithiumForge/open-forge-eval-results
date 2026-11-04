import { describe, expect, it } from 'vitest';
import { createGame, activateCard, advanceGame, isWon, MAX_TIME, MAX_MOVES } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { replayGame } from './replay.ts';
import { parseBoardCode } from './deck.ts';
describe('version 1 game', () => {
  it('generates the published literal vector and rejects noncanonical codes', () => {
    expect(createGame('np1-4-1').deck).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]);
    for (const code of ['np1-04-1','np1-4-0','np1-4-01',' np1-4-1','np1-4-2147483647']) expect(parseBoardCode(code)).toBeNull();
  });
  it('handles ignored selections, match, mismatch and exact timeout', () => {
    let game = createGame('np1-4-1'); game = activateCard(game, 0);
    expect(activateCard(game, 0)).toBe(game);
    game = activateCard(game, 11); expect(game.moves).toBe(1); expect(game.matched).toEqual([0,11]);
    game = activateCard(activateCard(game, 1), 2); expect(game.moves).toBe(2);
    expect(activateCard(game, 3)).toBe(game);
    game = advanceGame(game, 799); expect(game.selection.kind).toBe('mismatch');
    game = advanceGame(game, 1); expect(game.selection.kind).toBe('closed');
  });
  it('validates snapshot invariants and round trips', () => {
    const data = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
    const game = decodeSnapshot(data); expect(game).not.toBeNull(); expect(decodeSnapshot(encodeSnapshot(game!))).toEqual(game);
    for (const bad of [data.replace('"remainingMs":300','"remainingMs":0'), data.replace('[0,11]','[0,1]'), data.replace('"moves":2','"moves":1'), data.replace('"version":1','"version":1,"extra":0')]) expect(decodeSnapshot(bad)).toBeNull();
  });
  it('replays at equal timeout and caps elapsed time', () => {
    const game = replayGame(JSON.stringify({ version:1, boardCode:'np1-4-1', actions:[{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:2}], endMs:800 }));
    expect(game?.selection).toEqual({kind:'one',index:2}); expect(game?.elapsedMs).toBe(800);
    expect(replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:0,index:0}],endMs:Number.MAX_SAFE_INTEGER}))?.elapsedMs).toBe(MAX_TIME);
    expect(replayGame('{"version":1}')).toBeNull();
  });
  it('completes each supported board and preserves move cap', () => {
    for (const size of [4,6,8,10,12,14,16]) {
      let game = createGame(`np1-${size}-1`);
      for (let face = 0; face < size * size / 2; face++) { const positions = game.deck.flatMap((value, index) => value === face ? [index] : []); game = activateCard(activateCard(game, positions[0]!), positions[1]!); }
      expect(isWon(game)).toBe(true); expect(game.moves).toBe(size * size / 2);
    }
    let game = {...createGame('np1-4-1'), moves: MAX_MOVES}; game = activateCard(activateCard(game, 0), 11); expect(game.moves).toBe(MAX_MOVES); expect(game.matched).toHaveLength(2);
  });
});

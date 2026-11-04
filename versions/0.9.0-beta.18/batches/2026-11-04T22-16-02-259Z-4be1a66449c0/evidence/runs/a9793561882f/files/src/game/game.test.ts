import { describe, expect, it } from 'vitest';
import { createGame, activateCard, advanceGame, formatTime, MAX_ELAPSED } from './game.ts';
import { parseBoardCode } from './boardCode.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { replayGame } from './replay.ts';
describe('board codes and rules', () => {
  it('generates the published vector and rejects noncanonical codes', () => {
    expect(createGame('np1-4-1').deck).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]);
    for (const code of ['np1-04-1','np1-4-01','np1-4-0','np1-4-2147483647',' np1-4-1','np2-4-1']) expect(parseBoardCode(code)).toBeNull();
  });
  it('counts only valid second cards and resolves mismatches at 800ms', () => {
    const initial = createGame('np1-4-1'); const one = activateCard(initial, 0);
    expect(activateCard(one, 0)).toBe(one);
    const miss = activateCard(one, 1); expect(miss.moves).toBe(1); expect(activateCard(miss, 11)).toBe(miss);
    expect(advanceGame(miss, 799).selection).toEqual({kind:'mismatch',first:0,second:1,remainingMs:1});
    const closed = advanceGame(miss, 800); expect(closed.selection.kind).toBe('closed');
    const match = activateCard(activateCard(closed, 0), 11); expect(match.matched).toEqual([0,11]); expect(match.moves).toBe(2);
    expect(formatTime(3600000)).toBe('60:00'); expect(advanceGame(match, Number.MAX_SAFE_INTEGER).elapsedMs).toBe(MAX_ELAPSED);
  });
  it('completes every supported size with one move per pair', () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16]) {
      let state = createGame(`np1-${size}-1`);
      for (let face = 0; face < size * size / 2; face++) {
        const first = state.deck.indexOf(face); const second = state.deck.lastIndexOf(face);
        expect(first).not.toBe(second);
        state = activateCard(activateCard(state, first), second);
      }
      expect(state.matched).toHaveLength(size * size); expect(state.moves).toBe(size * size / 2);
    }
  });
  it('round trips and validates complete snapshot data', () => {
    const text = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
    const state = decodeSnapshot(text); expect(state).not.toBeNull(); if (!state) return;
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    for (const bad of [text.replace('"moves":2','"moves":1'),text.replace('[0,11]','[0,1]'),text.replace('"remainingMs":300','"remainingMs":0'),text.replace('"started":true','"started":false'),text.replace('"version":1','"extra":0,"version":1')]) expect(decodeSnapshot(bad)).toBeNull();
  });
  it('replays the literal example and resolves timeout before equal-time actions', () => {
    const result = replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:0,index:0},{atMs:0,index:11}],endMs:800}));
    expect(result?.matched).toEqual([0,11]); expect(result?.moves).toBe(1); expect(result?.elapsedMs).toBe(800);
    const boundary = replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:2}],endMs:800}));
    expect(boundary?.selection).toEqual({kind:'one',index:2});
    expect(replayGame('{"version":1}')).toBeNull();
  });
});

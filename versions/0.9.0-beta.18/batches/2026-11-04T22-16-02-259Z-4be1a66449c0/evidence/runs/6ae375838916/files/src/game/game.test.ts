import { describe, expect, it } from 'vitest';
import { parseBoard } from './deck.ts';
import { activateCard, advanceGame, createGame, formatTime, isWon } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { replayGame } from './replay.ts';
function game() { const result = createGame('np1-4-1'); if (!result) throw new Error('game'); return result; }
describe('board generation', () => {
  it('matches the independent published vector', () => {
    expect(parseBoard('np1-4-1')?.deck).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]);
    for (const code of ['np1-4-01','np1-4-0','np1-5-1','np1-4-2147483647',' np1-4-1']) expect(parseBoard(code)).toBeNull();
  });
});
describe('turns and time', () => {
  it('ignores repeated cards and closes a mismatch at 800ms', () => {
    let state = activateCard(game(), 0);
    expect(activateCard(state, 0)).toBe(state);
    state = activateCard(state, 1);
    expect(state.moves).toBe(1);
    expect(activateCard(state, 2)).toBe(state);
    state = advanceGame(state, 799);
    expect(state.selection.kind).toBe('mismatch');
    state = advanceGame(state, 1);
    expect(state.selection.kind).toBe('closed');
    expect(state.elapsedMs).toBe(800);
  });
  it('completes every supported board size', () => {
    for (const size of [4,6,8,10,12,14,16]) {
      let state = createGame(`np1-${size}-1`);
      if (!state) throw new Error('game');
      for (let face = 0; face < size * size / 2; face++) {
        const first = state.board.deck.indexOf(face), second = state.board.deck.lastIndexOf(face);
        state = activateCard(activateCard(state, first), second);
      }
      expect(isWon(state)).toBe(true);
      expect(state.moves).toBe(size * size / 2);
    }
  });
  it('matches immediately and stops at victory', () => {
    let state = game();
    for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) {
      if (a === undefined || b === undefined) throw new Error('pair');
      state = activateCard(activateCard(state, a), b);
    }
    expect(isWon(state)).toBe(true); expect(state.moves).toBe(8);
    expect(advanceGame(state, 500).elapsedMs).toBe(0);
    expect(formatTime(3600000)).toBe('60:00');
  });
});
describe('formats', () => {
  it('round trips snapshots and rejects inconsistent input', () => {
    const state = advanceGame(activateCard(activateCard(game(), 0), 1), 500);
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    const obj = JSON.parse(encodeSnapshot(state));
    expect(decodeSnapshot(JSON.stringify({ ...obj, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...obj, matched: [0] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...obj, selection: {kind:'mismatch',first:0,second:11,remainingMs:1} }))).toBeNull();
  });
  it('replays example and resolves an exact timeout before an action', () => {
    const example = replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:0,index:0},{atMs:0,index:11}],endMs:800}));
    expect(example?.matched).toEqual([0,11]); expect(example?.elapsedMs).toBe(800);
    const timed = replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:2}],endMs:800}));
    expect(timed?.selection).toEqual({kind:'one',index:2});
    expect(replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:1,index:0}],endMs:0}))).toBeNull();
  });
});

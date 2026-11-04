import { describe, expect, it } from 'vitest';
import { parseBoard } from './deck.ts';
import { activateCard, advanceGame, createGame, isWon } from './state.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { replayGame } from './replay.ts';
function game() { const state = createGame('np1-4-1'); if (!state) throw Error('fixture'); return state; }
describe('board codes', () => {
  it('matches the independent published vector', () => { expect(parseBoard('np1-4-1')?.deck).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]); });
  it('rejects invalid codes', () => { for (const code of ['np1-04-1','np1-4-0','np1-4-01','np1-4-2147483647',' np1-4-1','np2-4-1']) expect(parseBoard(code)).toBeNull(); });
});
describe('game rules', () => {
  it('ignores repeated and blocked activations and closes a miss at 800ms', () => {
    const first = activateCard(game(), 0); expect(activateCard(first, 0)).toBe(first);
    const miss = activateCard(first, 1); expect(miss.moves).toBe(1); expect(activateCard(miss, 11)).toBe(miss);
    expect(advanceGame(miss, 799).selection.kind).toBe('mismatch'); expect(advanceGame(miss, 800).selection.kind).toBe('closed');
  });
  it('matches and wins immediately', () => { let s = game(); for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) { if (a === undefined || b === undefined) throw Error(); s = activateCard(activateCard(s,a),b); } expect(isWon(s)).toBe(true); expect(s.moves).toBe(8); });
});
describe('snapshots and replay', () => {
  it('round trips a pending miss and rejects inconsistent data', () => {
    const s = advanceGame(activateCard(activateCard(game(), 0), 1), 500);
    expect(decodeSnapshot(encodeSnapshot(s))).toEqual(s);
    const data: unknown = JSON.parse(encodeSnapshot(s)); if (typeof data !== 'object' || data === null) throw Error();
    expect(decodeSnapshot(JSON.stringify({ ...data, extra: 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...data, matched: [0] }))).toBeNull();
  });
  it('honors equal-time actions and resolves the deadline before activation', () => {
    const replay = { version: 1, boardCode: 'np1-4-1', actions: [{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:11}], endMs:800 };
    const s = replayGame(JSON.stringify(replay)); expect(s?.selection).toEqual({kind:'one',index:11}); expect(s?.elapsedMs).toBe(800);
    expect(replayGame(JSON.stringify({ ...replay, endMs: 799 }))).toBeNull();
  });
});

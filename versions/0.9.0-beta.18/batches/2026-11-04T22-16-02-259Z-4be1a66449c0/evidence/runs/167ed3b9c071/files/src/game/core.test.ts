import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame, isWon } from './core.ts';
function game() { const g = createGame('np1-4-1'); if (!g) throw new Error('missing game'); return g; }
describe('game rules', () => {
  it('matches the independent documented shuffle vector', () => { expect(game().deck).toEqual([6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3]); });
  it('counts valid turns and waits 800 active milliseconds for a mismatch', () => {
    let g = activateCard(game(), 0); g = activateCard(g, 0); expect(g.moves).toBe(0);
    g = activateCard(g, 1); expect(g.moves).toBe(1); expect(activateCard(g, 11)).toBe(g);
    g = advanceGame(g, 799); expect(g.selection.kind).toBe('mismatch');
    g = advanceGame(g, 1); expect(g.selection.kind).toBe('closed');
    g = activateCard(activateCard(g, 0), 11); expect(g.matched).toEqual([0,11]); expect(g.moves).toBe(2);
  });
  it('creates complete pairs at every supported size', () => {
    for (const size of [4,6,8,10,12,14,16]) { const g = createGame(`np1-${size}-1`); expect(g?.deck.length).toBe(size * size); for (let face = 0; face < size * size / 2; face++) expect(g?.deck.filter(x => x === face)).toHaveLength(2); }
    for (const code of ['np1-4-0','np1-04-1','np1-4-01','np1-4-2147483647','np2-4-1']) expect(createGame(code)).toBeNull();
  });
  it('stops time at victory', () => {
    let g = game();
    for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) { if (a === undefined || b === undefined) throw new Error(); g = activateCard(activateCard(g,a),b); }
    expect(isWon(g)).toBe(true); expect(advanceGame(g, 1000).elapsedMs).toBe(0);
  });
});

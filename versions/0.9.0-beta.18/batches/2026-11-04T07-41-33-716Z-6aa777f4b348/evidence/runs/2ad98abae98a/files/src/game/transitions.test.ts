import { describe, expect, it } from 'vitest';
import { createGame } from './deal.ts';
import { activateCard, advanceGame, formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';

function initial() {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid test code');
  return game;
}
describe('turns and active time', () => {
  it('counts second reveals only and leaves immutable data untouched', () => {
    const start = initial();
    expect(advanceGame(start, 1000)).toBe(start);
    const one = activateCard(start, 0);
    expect(one.selection).toEqual({ kind: 'one', index: 0 });
    expect(one.moves).toBe(0);
    expect(activateCard(one, 0)).toBe(one);
    const pair = activateCard(one, 11);
    expect(pair.matched).toEqual([0, 11]);
    expect(pair.moves).toBe(1);
    expect(activateCard(pair, 11)).toBe(pair);
    expect(pair.deck).toBe(start.deck);
    expect(start.matched).toEqual([]);
    expect(start.started).toBe(false);
  });
  it('ignores input during a miss and closes at exactly 800 active ms', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.selection.kind).toBe('closed');
    expect(closed.elapsedMs).toBe(800);
    expect(activateCard(closed, 2).selection).toEqual({ kind: 'one', index: 2 });
  });
  it('preserves fractional active time independently of tick frequency', () => {
    let state = activateCard(initial(), 0);
    for (let tick = 0; tick < 8; tick++) state = advanceGame(state, 0.125);
    expect(state.elapsedMs).toBe(1);
  });
  it('completes, then ignores activation and time', () => {
    let state = initial();
    for (let id = 0; id < 8; id++) {
      const [first, second] = state.deck.flatMap((face, index) => face === id ? [index] : []);
      if (first === undefined || second === undefined) throw new Error('Missing pair');
      state = activateCard(advanceGame(activateCard(state, first), 100), second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(8);
    expect(state.elapsedMs).toBe(800);
    expect(advanceGame(state, 1000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });
  it('caps clock and moves without stopping a mismatch or matching', () => {
    const near = { ...initial(), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS - 10 };
    const miss = activateCard(activateCard(near, 0), 1);
    const closed = advanceGame(miss, Number.MAX_SAFE_INTEGER);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection.kind).toBe('closed');
    const pair = activateCard(activateCard(closed, 0), 11);
    expect(pair.moves).toBe(MAX_MOVES);
    expect(pair.matched).toEqual([0, 11]);
  });
  it.each([-1, 16, 1.5, NaN])('ignores invalid position %s', index => {
    const state = initial();
    expect(activateCard(state, index)).toBe(state);
  });
  it('formats minutes beyond 59 and rounds seconds down', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(61000)).toBe('1:01');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
  });
});

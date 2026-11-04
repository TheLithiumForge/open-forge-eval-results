import { describe, expect, it } from 'vitest';
import { SIZES } from './boardCode.ts';
import { activateCard, advanceGame, createGame, formatTime, isWon, MOVE_CAP, TIME_CAP } from './state.ts';
import type { GameState } from './state.ts';

function initial(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test code');
  return state;
}

describe('turn rules', () => {
  it('reveals once, ignores repeats, and matches immediately for one move', () => {
    const base = initial();
    const one = activateCard(base, 0);
    expect(one.selection).toEqual({ kind: 'one', index: 0 });
    expect(one.started).toBe(true);
    expect(one.moves).toBe(0);
    expect(activateCard(one, 0)).toBe(one);
    const match = activateCard(one, 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.selection.kind).toBe('closed');
    expect(match.moves).toBe(1);
    expect(activateCard(match, 0)).toBe(match);
    expect(base.matched).toEqual([]);
  });
  it('blocks activation during a miss and closes both at precisely 800ms', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const pending = advanceGame(miss, 799);
    expect(pending.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(advanceGame(pending, 1).selection.kind).toBe('closed');
    expect(advanceGame(miss, 1000).elapsedMs).toBe(1000);
  });
  it('starts the clock on the first reveal and caps both counters without stopping play', () => {
    expect(advanceGame(initial(), 10000).elapsedMs).toBe(0);
    const one = activateCard(initial(), 0);
    const capped = advanceGame({ ...one, moves: MOVE_CAP, elapsedMs: TIME_CAP - 1 }, 100);
    expect(capped.elapsedMs).toBe(TIME_CAP);
    const miss = activateCard(capped, 1);
    expect(miss.moves).toBe(MOVE_CAP);
    expect(advanceGame(miss, 800).selection.kind).toBe('closed');
  });
  it.each(SIZES)('completes size %i and stops time on the last pair', size => {
    let state = initial(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face++) {
      state = activateCard(state, state.board.deck.indexOf(face));
      state = advanceGame(state, 10);
      state = activateCard(state, state.board.deck.lastIndexOf(face));
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(advanceGame(state, 5000)).toBe(state);
  });
  it('formats uncapped minutes and ignores invalid advances and indices', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(TIME_CAP)).toBe('5999:59');
    const base = initial();
    for (const value of [-1, 16, NaN, 0.5]) expect(activateCard(base, value)).toBe(base);
    const one = activateCard(base, 0);
    for (const value of [-1, NaN, Infinity, 0.5]) expect(advanceGame(one, value)).toBe(one);
  });
});

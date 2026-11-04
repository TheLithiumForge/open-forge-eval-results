import { describe, expect, it } from 'vitest';
import { activateCard, MAX_MOVES } from './activateCard.ts';
import { advanceGame, MAX_ELAPSED_MS, formatTime } from './advanceGame.ts';
import { SUPPORTED_SIZES } from './boardCode.ts';
import { createGame, isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';

function initial(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Invalid fixture code');
  return state;
}

describe('card transitions', () => {
  it('starts on first reveal and ignores the same card, invalid positions and matched cards', () => {
    const untouched = initial();
    expect(advanceGame(untouched, 1000)).toBe(untouched);
    const one = activateCard(untouched, 0);
    expect(one.selection).toEqual({ kind: 'one', index: 0 });
    expect(one.started).toBe(true);
    expect(one.moves).toBe(0);
    for (const index of [0, -1, 16, 1.5, NaN]) expect(activateCard(one, index)).toBe(one);
    const match = activateCard(one, 11);
    expect(match.selection).toEqual({ kind: 'closed' });
    expect(match.matched).toEqual([0, 11]);
    expect(match.moves).toBe(1);
    expect(activateCard(match, 11)).toBe(match);
    expect(untouched.matched).toEqual([]);
  });
  it('blocks a miss until exactly 800 active milliseconds and closes both together', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
    expect(activateCard(closed, 2).selection).toEqual({ kind: 'one', index: 2 });
  });
  it.each(SUPPORTED_SIZES)('finishes a side-%i board with complete pairs', (size) => {
    let state = initial(`np1-${size}-1`);
    for (let face = 0; face < state.deck.length / 2; face += 1) {
      state.deck.forEach((value, index) => { if (value === face) state = activateCard(state, index); });
      state = advanceGame(state, 10);
    }
    expect(isWon(state)).toBe(true);
    expect(pairCount(state)).toBe(size ** 2 / 2);
    expect(state.moves).toBe(size ** 2 / 2);
    expect(advanceGame(state, 900)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });
  it('continues matching and resolving misses after both counters cap', () => {
    const capped = { ...initial(), started: true, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
    const match = activateCard(activateCard(capped, 0), 11);
    expect(match.moves).toBe(MAX_MOVES);
    expect(pairCount(match)).toBe(1);
    const miss = activateCard(activateCard(match, 1), 2);
    expect(advanceGame(miss, 800).selection.kind).toBe('closed');
    expect(advanceGame(miss, Number.MAX_SAFE_INTEGER).elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it('preserves active fractional time and formats minutes without wrapping', () => {
    const one = activateCard(initial(), 0);
    expect(advanceGame(one, 0.5).elapsedMs).toBe(0.5);
    for (const invalid of [-1, NaN, Infinity]) expect(advanceGame(one, invalid)).toBe(one);
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(61000)).toBe('1:01');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
  });
});

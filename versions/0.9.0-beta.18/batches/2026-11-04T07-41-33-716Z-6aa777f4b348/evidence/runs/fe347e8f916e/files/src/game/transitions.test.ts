import { describe, expect, it } from 'vitest';
import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './model.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { formatTime } from './format.ts';
import { SIZES } from './boardCode.ts';

function initial(code = 'np1-4-1') {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test board');
  return state;
}

describe('turns and active logical time', () => {
  it('starts on the first eligible reveal, ignores repeats, and matches immediately', () => {
    const hidden = initial();
    expect(advanceGame(hidden, 4000)).toBe(hidden);
    const first = activateCard(hidden, 0);
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 0)).toBe(first);
    const pair = activateCard(first, 11);
    expect(pair).toMatchObject({ matched: [0, 11], moves: 1, selection: { kind: 'closed' } });
    expect(activateCard(pair, 0)).toBe(pair);
    expect(hidden.matched).toEqual([]);
    expect(hidden.selection).toEqual({ kind: 'closed' });
  });
  it('blocks every activation during a miss, closing both at exactly 800ms', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
    expect(activateCard(closed, 2).selection).toEqual({ kind: 'one', index: 2 });
  });
  it.each(SIZES)('can complete size %i and freezes the clock after the last pair', (size) => {
    let state = initial(`np1-${size}-42`);
    for (let face = 0; face < size * size / 2; face += 1) {
      const positions = state.board.deck.flatMap((value, index) => value === face ? [index] : []);
      for (const index of positions) state = activateCard(advanceGame(state, 100), index);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(advanceGame(state, 4000)).toBe(state);
  });
  it('saturates counters without preventing further play or mismatch closing', () => {
    let state = { ...initial(), started: true, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
    state = activateCard(activateCard(state, 0), 1);
    expect(state.moves).toBe(MAX_MOVES);
    state = advanceGame(state, 800);
    expect(state.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(state.selection.kind).toBe('closed');
    state = activateCard(activateCard(state, 0), 11);
    expect(state.matched).toEqual([0, 11]);
  });
  it('ignores invalid indices and nonpositive or nonfinite time', () => {
    const state = activateCard(initial(), 0);
    for (const index of [-1, 16, 0.5, NaN]) expect(activateCard(state, index)).toBe(state);
    for (const time of [-1, 0, NaN, Infinity]) expect(advanceGame(state, time)).toBe(state);
  });
  it('formats time by rounding down and letting minutes exceed 59', () => {
    expect([0, 999, 59999, 60000, 3600000, MAX_ELAPSED_MS].map(formatTime))
      .toEqual(['0:00', '0:00', '0:59', '1:00', '60:00', '5999:59']);
  });
});

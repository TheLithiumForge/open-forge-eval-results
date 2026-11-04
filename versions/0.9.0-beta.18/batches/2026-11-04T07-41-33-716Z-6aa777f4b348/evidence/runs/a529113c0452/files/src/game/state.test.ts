import { describe, expect, it } from 'vitest';
import { GRID_SIZES } from './boardCode.ts';
import { activateCard, advanceGame, createGame, formatTime, isRevealed, isWon,
  MAX_ELAPSED_MS, MAX_MOVES, pairCount } from './state.ts';

function initial(code = 'np1-4-1') {
  const state = createGame(code);
  if (state === null) throw new Error('Invalid test board.');
  return state;
}

describe('game transitions', () => {
  it('ignores invalid positions and the clock before the first reveal', () => {
    const state = initial();
    expect(advanceGame(state, 1000)).toBe(state);
    for (const index of [-1, 16, 0.5, NaN, Infinity]) expect(activateCard(state, index)).toBe(state);
    expect(createGame('bad')).toBeNull();
  });

  it('starts on a valid reveal, ignores its repeat, then matches immediately', () => {
    const hidden = initial();
    const one = activateCard(hidden, 0);
    expect(one.started).toBe(true);
    expect(one.moves).toBe(0);
    expect(isRevealed(one, 0)).toBe(true);
    expect(isRevealed(one, 11)).toBe(false);
    expect(activateCard(one, 0)).toBe(one);
    const matched = activateCard(advanceGame(one, 1250), 11);
    expect(matched.moves).toBe(1);
    expect(pairCount(matched)).toBe(1);
    expect(matched.selection).toEqual({ kind: 'closed' });
    expect(matched.elapsedMs).toBe(1250);
    expect(activateCard(matched, 0)).toBe(matched);
    expect(hidden.matched).toEqual([]);
    expect(hidden.selection).toEqual({ kind: 'closed' });
    expect(matched.board).toBe(hidden.board);
  });

  it('blocks activation during a miss and closes both at exactly 800 active ms', () => {
    const missed = activateCard(activateCard(initial(), 0), 1);
    expect(missed.moves).toBe(1);
    expect(activateCard(missed, 2)).toBe(missed);
    const waiting = advanceGame(missed, 799);
    expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(isRevealed(waiting, 0)).toBe(true);
    expect(isRevealed(waiting, 1)).toBe(true);
    expect(advanceGame(waiting, 1).selection).toEqual({ kind: 'closed' });
    expect(missed.selection.kind).toBe('mismatch');
  });

  it('retains fractional time and still closes misses at the elapsed cap', () => {
    const missed = activateCard(activateCard(initial(), 0), 1);
    const fractional = advanceGame(advanceGame(missed, 0.25), 0.5);
    expect(fractional.elapsedMs).toBe(0.75);
    expect(fractional.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 799.25 });
    const capped = { ...missed, elapsedMs: MAX_ELAPSED_MS };
    expect(advanceGame(capped, 800).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(capped, 800).elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(activateCard({ ...activateCard(initial(), 0), moves: MAX_MOVES }, 11).moves).toBe(MAX_MOVES);
    for (const delta of [0, -1, NaN, Infinity]) expect(advanceGame(missed, delta)).toBe(missed);
  });

  it.each(GRID_SIZES)('finishes size %i and freezes time at the final match', (size) => {
    let state = initial(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face += 1) {
      const first = state.board.deck.indexOf(face);
      const second = state.board.deck.lastIndexOf(face);
      state = activateCard(advanceGame(activateCard(state, first), 10), second);
    }
    expect(isWon(state)).toBe(true);
    expect(pairCount(state)).toBe(size * size / 2);
    expect(state.moves).toBe(size * size / 2);
    expect(advanceGame(state, 1000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });

  it('formats uncapped minutes and floors seconds', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(61_999)).toBe('1:01');
    expect(formatTime(3_600_000)).toBe('60:00');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
  });
});

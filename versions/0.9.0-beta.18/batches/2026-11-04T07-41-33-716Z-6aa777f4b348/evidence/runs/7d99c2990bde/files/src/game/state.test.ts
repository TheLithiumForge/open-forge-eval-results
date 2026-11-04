import { describe, expect, it } from 'vitest';
import { boardSizes } from './boardCode.ts';
import { activateCard, advanceGame, createGame, isRevealed, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';

function initial(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Expected valid state');
  return state;
}

describe('card transitions and logical time', () => {
  it('starts only on a valid reveal, ignores repeats, and matches immediately', () => {
    const original = initial();
    expect(advanceGame(original, 300)).toBe(original);
    expect(activateCard(original, -1)).toBe(original);
    expect(activateCard(original, 1.5)).toBe(original);
    expect(activateCard(original, 16)).toBe(original);
    const first = activateCard(original, 0);
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(isRevealed(first, 0)).toBe(true);
    expect(activateCard(first, 0)).toBe(first);
    const matched = activateCard(first, 11);
    expect(matched.matched).toEqual([0, 11]);
    expect(matched.selection).toEqual({ kind: 'closed' });
    expect(matched.moves).toBe(1);
    expect(activateCard(matched, 0)).toBe(matched);
    expect(original.matched).toEqual([]);
    expect(original.selection).toEqual({ kind: 'closed' });
  });

  it('blocks all reveals during a miss and closes both at exactly 800 active ms', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(miss.moves).toBe(1);
    expect(isRevealed(miss, 0)).toBe(true);
    expect(isRevealed(miss, 1)).toBe(true);
    expect(activateCard(miss, 2)).toBe(miss);
    const almost = advanceGame(miss, 799);
    expect(almost.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    const closed = advanceGame(almost, 1);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
    expect(isRevealed(closed, 0)).toBe(false);
  });

  it('caps scores and elapsed time while mismatch countdown and play continue', () => {
    const capped = { ...initial(), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true };
    const miss = activateCard(activateCard(capped, 0), 1);
    expect(miss.moves).toBe(MAX_MOVES);
    const closed = advanceGame(miss, 1000);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection.kind).toBe('closed');
    const match = activateCard(activateCard(closed, 0), 11);
    expect(match.moves).toBe(MAX_MOVES);
    expect(match.matched).toHaveLength(2);
  });

  it.each(boardSizes)('completes a %ix%i board and stops time', size => {
    let state = initial(`np1-${size}-1`);
    for (let face = 0; face < state.deck.length / 2; face++) {
      const first = state.deck.indexOf(face);
      const second = state.deck.lastIndexOf(face);
      state = activateCard(state, first);
      state = advanceGame(state, 10);
      state = activateCard(state, second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(state.elapsedMs).toBe(size * size * 5);
    expect(advanceGame(state, 1000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });

  it('ignores invalid time advances', () => {
    const state = activateCard(initial(), 0);
    for (const time of [0, -1, Infinity, NaN]) expect(advanceGame(state, time)).toBe(state);
  });
});

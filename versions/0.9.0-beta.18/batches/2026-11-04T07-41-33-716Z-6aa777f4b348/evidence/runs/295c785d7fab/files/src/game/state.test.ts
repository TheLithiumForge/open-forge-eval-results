import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';

function initial(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Expected fixture board.');
  return state;
}

describe('turns and active logical time', () => {
  it('starts the clock at first valid reveal and ignores repeated or invalid activations', () => {
    const state = initial();
    expect(advanceGame(state, 5000)).toBe(state);
    for (const index of [-1, 16, 0.5, NaN]) expect(activateCard(state, index)).toBe(state);
    const first = activateCard(state, 0);
    expect(first.selection).toEqual({ kind: 'one', index: 0 });
    expect(first.moves).toBe(0);
    expect(first.started).toBe(true);
    expect(activateCard(first, 0)).toBe(first);
    expect(advanceGame(first, 1234.5).elapsedMs).toBe(1234.5);
    expect(state.selection).toEqual({ kind: 'closed' });
  });

  it('matches immediately and ignores matched positions', () => {
    const state = activateCard(activateCard(initial(), 0), 11);
    expect(state.moves).toBe(1);
    expect(state.matched).toEqual([0, 11]);
    expect(state.selection.kind).toBe('closed');
    expect(activateCard(state, 0)).toBe(state);
  });

  it('blocks a mismatch for exactly 800 active milliseconds', () => {
    const state = activateCard(activateCard(initial(), 0), 1);
    expect(state.moves).toBe(1);
    expect(activateCard(state, 2)).toBe(state);
    const almost = advanceGame(state, 799.75);
    expect(almost.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 0.25 });
    const closed = advanceGame(almost, 0.25);
    expect(closed.selection.kind).toBe('closed');
    expect(closed.elapsedMs).toBe(800);
    expect(activateCard(closed, 2).selection).toEqual({ kind: 'one', index: 2 });
  });

  it('continues turns and mismatch time at both caps', () => {
    const capped = { ...initial(), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
    const miss = activateCard(activateCard(capped, 0), 1);
    expect(miss.moves).toBe(MAX_MOVES);
    const closed = advanceGame(miss, 800);
    expect(closed.selection.kind).toBe('closed');
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(activateCard(activateCard(closed, 0), 11).matched).toEqual([0, 11]);
  });

  it('stops time at victory and derives victory from the matched positions', () => {
    let state = activateCard(initial(), 0);
    state = advanceGame(state, 1234);
    state = activateCard(state, 11);
    for (const [first, second] of [[1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]]) {
      if (first === undefined || second === undefined) throw new Error('Invalid pair fixture.');
      state = activateCard(activateCard(state, first), second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(8);
    expect(advanceGame(state, 99999)).toBe(state);
    expect(state.elapsedMs).toBe(1234);
  });

  it('rejects invalid time deltas without affecting state', () => {
    const state = activateCard(initial(), 0);
    for (const delta of [0, -1, NaN, Infinity]) expect(advanceGame(state, delta)).toBe(state);
    expect(createGame('invalid')).toBeNull();
  });
});

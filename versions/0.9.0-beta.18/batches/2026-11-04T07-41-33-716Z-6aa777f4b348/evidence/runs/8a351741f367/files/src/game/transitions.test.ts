import { describe, expect, it } from 'vitest';
import { createGame, isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame, formatTime, MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';
import { SIZES } from './boardCode.ts';

function initial(size = 4): GameState {
  const state = createGame(`np1-${size}-1`);
  if (!state) throw new Error('Invalid test board.');
  return state;
}

describe('card turns and active time', () => {
  it('ignores invalid positions and starts only on a valid first reveal', () => {
    const game = initial();
    expect(advanceGame(game, 5_000)).toBe(game);
    for (const index of [-1, 16, NaN, Infinity, 0.5]) expect(activateCard(game, index)).toBe(game);
    const one = activateCard(game, 0);
    expect(one.selection).toEqual({ kind: 'one', index: 0 });
    expect(one.started).toBe(true);
    expect(one.moves).toBe(0);
    expect(activateCard(one, 0)).toBe(one);
    expect(game.selection).toEqual({ kind: 'closed' });
  });

  it('matches immediately for one move, keeping matched activations inert', () => {
    const game = activateCard(activateCard(initial(), 0), 11);
    expect(game.selection).toEqual({ kind: 'closed' });
    expect(game.matched).toEqual([0, 11]);
    expect(game.moves).toBe(1);
    expect(pairCount(game)).toBe(1);
    expect(activateCard(game, 11)).toBe(game);
  });

  it('blocks mismatch activation and closes both at precisely 800 active ms', () => {
    const game = activateCard(activateCard(initial(), 0), 1);
    expect(game.moves).toBe(1);
    expect(game.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(activateCard(game, 2)).toBe(game);
    const almost = advanceGame(game, 799.75);
    expect(almost.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 0.25 });
    expect(advanceGame(almost, 0.25).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(almost, 0.25).elapsedMs).toBe(800);
  });

  it('does not advance invalid, zero or negative time', () => {
    const game = activateCard(initial(), 0);
    for (const delta of [0, -1, NaN, Infinity]) expect(advanceGame(game, delta)).toBe(game);
  });

  it('caps moves and elapsed time while continuing to resolve turns', () => {
    const game = { ...activateCard(initial(), 0), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS - 1 };
    const mismatch = activateCard(game, 1);
    expect(mismatch.moves).toBe(MAX_MOVES);
    const closed = advanceGame(mismatch, 800);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection).toEqual({ kind: 'closed' });
    const matched = activateCard(activateCard(closed, 0), 11);
    expect(matched.matched).toEqual([0, 11]);
    expect(matched.moves).toBe(MAX_MOVES);
  });

  it.each(SIZES)('completes a %i board and stops the clock', (size) => {
    let game = initial(size);
    const pairs = new Map<number, number[]>();
    game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
    for (const positions of pairs.values()) {
      for (const index of positions) game = activateCard(advanceGame(game, 10), index);
    }
    expect(isWon(game)).toBe(true);
    expect(pairCount(game)).toBe(size * size / 2);
    expect(game.moves).toBe(size * size / 2);
    expect(advanceGame(game, 10_000)).toBe(game);
  });

  it('formats whole seconds, unbounded minutes and the elapsed cap', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(61_999)).toBe('1:01');
    expect(formatTime(3_600_000)).toBe('60:00');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
  });
});

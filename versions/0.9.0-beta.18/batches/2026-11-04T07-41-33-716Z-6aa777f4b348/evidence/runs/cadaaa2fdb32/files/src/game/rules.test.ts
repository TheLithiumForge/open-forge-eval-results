import { describe, expect, it } from 'vitest';
import { SIZES } from './boardCode.ts';
import { activateCard, advanceGame, formatTime, MAX_ELAPSED_MS, MAX_MOVES } from './rules.ts';
import { createGame, isWon } from './state.ts';

function initial(code = 'np1-4-1') {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test board.');
  return game;
}

describe('turns, active time and completion', () => {
  it('starts only on a valid reveal, ignores repeats and matches immediately', () => {
    let game = initial();
    expect(advanceGame(game, 5000)).toBe(game);
    expect(activateCard(game, -1)).toBe(game);
    expect(activateCard(game, 0.5)).toBe(game);
    game = activateCard(game, 0);
    expect(game.started).toBe(true);
    expect(game.moves).toBe(0);
    expect(activateCard(game, 0)).toBe(game);
    game = activateCard(game, 11);
    expect(game.matched).toEqual([0, 11]);
    expect(game.moves).toBe(1);
    expect(game.selection).toEqual({ kind: 'closed' });
    expect(activateCard(game, 11)).toBe(game);
  });
  it('blocks a mismatch and closes both at exactly 800 active milliseconds', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(advanceGame(waiting, 1).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(miss, 800).elapsedMs).toBe(800);
    expect(miss.selection.kind).toBe('mismatch');
  });
  it('caps scores and time while still permitting turns', () => {
    let game = { ...initial(), started: true, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS - 1 };
    game = advanceGame(game, Number.MAX_SAFE_INTEGER);
    expect(game.elapsedMs).toBe(MAX_ELAPSED_MS);
    game = activateCard(activateCard(game, 0), 11);
    expect(game.moves).toBe(MAX_MOVES);
    expect(game.matched).toHaveLength(2);
    game = activateCard(activateCard(game, 1), 2);
    expect(advanceGame(game, 800).selection.kind).toBe('closed');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
    expect(formatTime(3600000)).toBe('60:00');
  });
  it.each(SIZES)('finishes size %i and stops the clock', size => {
    let game = initial(`np1-${size}-1`);
    for (let face = 0; face < size ** 2 / 2; face++) {
      game = activateCard(game, game.deck.indexOf(face));
      game = advanceGame(game, 100);
      game = activateCard(game, game.deck.lastIndexOf(face));
    }
    expect(isWon(game)).toBe(true);
    expect(game.moves).toBe(size ** 2 / 2);
    expect(advanceGame(game, 1000)).toBe(game);
    expect(activateCard(game, 0)).toBe(game);
  });
});

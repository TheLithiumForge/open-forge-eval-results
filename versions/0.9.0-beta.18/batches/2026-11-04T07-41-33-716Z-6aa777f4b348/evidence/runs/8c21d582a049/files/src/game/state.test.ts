import { describe, expect, it } from 'vitest';
import { SIZES } from './boardCode.ts';
import { activateCard, advanceGame, createGame, formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES, pairCount } from './state.ts';
import type { GameState } from './state.ts';

function initial(): GameState {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid test board');
  return game;
}

describe('turns and logical time (R02–R07)', () => {
  it('starts the clock at the first valid reveal, ignores reactivation and keeps its inputs', () => {
    const game = initial();
    expect(advanceGame(game, 5000)).toBe(game);
    const one = activateCard(game, 0);
    expect(one.started).toBe(true);
    expect(one.selection).toEqual({ kind: 'one', index: 0 });
    expect(one.moves).toBe(0);
    expect(activateCard(one, 0)).toBe(one);
    expect(game.started).toBe(false);
    expect(game.selection).toEqual({ kind: 'closed' });
    expect(one.board).toBe(game.board);
    expect(advanceGame(one, 1250).elapsedMs).toBe(1250);
  });
  it('matches immediately, counts one move and ignores matched positions', () => {
    const matched = activateCard(activateCard(initial(), 0), 11);
    expect(matched.matched).toEqual([0, 11]);
    expect(pairCount(matched)).toBe(1);
    expect(matched.selection).toEqual({ kind: 'closed' });
    expect(matched.moves).toBe(1);
    expect(activateCard(matched, 0)).toBe(matched);
  });
  it('blocks input for 800 active milliseconds and closes both at the exact boundary', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(activateCard(miss, 2)).toBe(miss);
    const pending = advanceGame(miss, 799);
    expect(pending.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(advanceGame(pending, 1).selection).toEqual({ kind: 'closed' });
    expect(miss.moves).toBe(1);
  });
  it.each(SIZES)('finishes every pair at size %i and stops time', size => {
    let game = createGame(`np1-${size}-1`);
    if (!game) throw new Error('Invalid test board');
    for (let face = 0; face < size ** 2 / 2; face++) {
      const first = game.board.deck.indexOf(face);
      const second = game.board.deck.lastIndexOf(face);
      game = advanceGame(activateCard(game, first), 10);
      game = activateCard(game, second);
    }
    expect(isWon(game)).toBe(true);
    expect(game.moves).toBe(size ** 2 / 2);
    expect(pairCount(game)).toBe(size ** 2 / 2);
    expect(advanceGame(game, 5000)).toBe(game);
  });
  it('caps score and elapsed time while still resolving misses and allowing wins', () => {
    const capped = { ...initial(), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true };
    const miss = advanceGame(activateCard(activateCard(capped, 0), 1), 800);
    expect(miss.selection).toEqual({ kind: 'closed' });
    expect(miss.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(miss.moves).toBe(MAX_MOVES);
    expect(pairCount(activateCard(activateCard(miss, 0), 11))).toBe(1);
  });
  it('formats whole seconds, minutes beyond 59 and the cap', () => {
    expect([0, 999, 1000, 61000, 3600000, MAX_ELAPSED_MS].map(formatTime))
      .toEqual(['0:00', '0:00', '0:01', '1:01', '60:00', '5999:59']);
  });
  it('preserves fractional active time without shortening a later mismatch', () => {
    const one = advanceGame(activateCard(initial(), 0), 0.75);
    const miss = activateCard(one, 1);
    const pending = advanceGame(miss, 799.25);
    expect(pending.elapsedMs).toBe(800);
    expect(pending.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 0.75 });
    expect(advanceGame(pending, 0.75).selection).toEqual({ kind: 'closed' });
    for (const invalid of [NaN, Infinity, -Infinity, -1]) expect(advanceGame(one, invalid)).toBe(one);
  });
});

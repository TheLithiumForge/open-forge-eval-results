import { describe, expect, it } from 'vitest';
import { sizes } from './deal.ts';
import { createGame, isWon } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame, elapsedCap, moveCap } from './turn.ts';
import { formatTime } from './format-time.ts';

function initial(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test board');
  return state;
}

describe('turns and active time', () => {
  it('ignores time before the first reveal, repeated first cards and matched cards', () => {
    let game = initial();
    expect(advanceGame(game, 10000)).toBe(game);
    game = activateCard(game, 0);
    expect(game.started).toBe(true);
    expect(activateCard(game, 0)).toBe(game);
    expect(game.moves).toBe(0);
    game = activateCard(game, 11);
    expect(game.matched).toEqual([0, 11]);
    expect(game.moves).toBe(1);
    expect(activateCard(game, 11)).toBe(game);
  });
  it('closes a mismatch at exactly 800ms and ignores every activation before then', () => {
    const game = activateCard(activateCard(initial(), 0), 1);
    expect(game.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(activateCard(game, 2)).toBe(game);
    const pending = advanceGame(game, 799.75);
    expect(pending.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 0.25 });
    expect(advanceGame(pending, 0.25).selection.kind).toBe('closed');
    expect(game.selection.kind).toBe('mismatch');
    expect(game.moves).toBe(1);
  });
  it.each(sizes)('completes every pair at size %i and stops the clock', size => {
    let game = initial(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face++) {
      const first = game.board.deck.indexOf(face);
      const second = game.board.deck.lastIndexOf(face);
      game = activateCard(game, first);
      game = advanceGame(game, 1000);
      game = activateCard(game, second);
    }
    expect(isWon(game)).toBe(true);
    expect(game.moves).toBe(size * size / 2);
    expect(game.elapsedMs).toBe(size * size / 2 * 1000);
    expect(advanceGame(game, 10000)).toBe(game);
    expect(activateCard(game, 0)).toBe(game);
  });
  it('caps counters independently while still resolving turns', () => {
    let game: GameState = { ...initial(), moves: moveCap, elapsedMs: elapsedCap, started: true };
    game = activateCard(activateCard(game, 0), 1);
    game = advanceGame(game, 800);
    expect(game.selection.kind).toBe('closed');
    game = activateCard(activateCard(game, 0), 11);
    expect(game.moves).toBe(moveCap);
    expect(game.elapsedMs).toBe(elapsedCap);
    expect(game.matched).toHaveLength(2);
  });
  it('ignores invalid indices and invalid time deltas', () => {
    const game = activateCard(initial(), 0);
    for (const index of [-1, 16, 0.5, NaN, Infinity]) expect(activateCard(game, index)).toBe(game);
    for (const ms of [-1, 0, NaN, Infinity]) expect(advanceGame(game, ms)).toBe(game);
  });
  it('formats unbounded minutes and floors seconds', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(elapsedCap)).toBe('5999:59');
  });
});

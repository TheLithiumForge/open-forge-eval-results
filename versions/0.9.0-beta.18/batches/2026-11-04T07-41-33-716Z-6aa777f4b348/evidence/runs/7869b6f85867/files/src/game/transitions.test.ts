import { describe, expect, it } from 'vitest';
import { SIZES } from './board-code.ts';
import { createGame, formatTime, isWon, KIND, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';

describe('turns and active time (R02–R07)', () => {
  it('starts only on a valid reveal and ignores repeated and matched cards', () => {
    const initial = createGame('np1-4-1');
    expect(advanceGame(initial, 5000)).toBe(initial);
    expect(activateCard(initial, -1)).toBe(initial);
    expect(activateCard(initial, 16)).toBe(initial);
    const one = activateCard(initial, 0);
    expect(one.started).toBe(true);
    expect(one.moves).toBe(0);
    expect(activateCard(one, 0)).toBe(one);
    const match = activateCard(one, 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.moves).toBe(1);
    expect(activateCard(match, 0)).toBe(match);
    expect(initial.matched).toEqual([]);
  });
  it('blocks activation for exactly 800 active milliseconds', () => {
    const miss = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 11)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toEqual({ kind: KIND.mismatch, first: 0, second: 1, remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.selection).toEqual({ kind: KIND.closed });
    expect(closed.elapsedMs).toBe(800);
    expect(activateCard(closed, 11).selection).toEqual({ kind: KIND.one, index: 11 });
  });
  it.each(SIZES)('completes every pair at size %i and stops its clock', size => {
    let game = createGame(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face++) {
      for (let index = 0; index < game.board.deck.length; index++) {
        if (game.board.deck[index] === face) game = activateCard(game, index);
      }
      game = advanceGame(game, 7);
    }
    expect(isWon(game)).toBe(true);
    expect(game.moves).toBe(size * size / 2);
    expect(advanceGame(game, 9999)).toBe(game);
    expect(activateCard(game, 0)).toBe(game);
  });
  it('continues play at both caps, including mismatch expiration', () => {
    let game = { ...createGame('np1-4-1'), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true };
    game = activateCard(activateCard(game, 0), 1);
    game = advanceGame(game, 800);
    expect(game.selection.kind).toBe(KIND.closed);
    expect(game.moves).toBe(MAX_MOVES);
    expect(game.elapsedMs).toBe(MAX_ELAPSED_MS);
    game = activateCard(activateCard(game, 0), 11);
    expect(game.matched).toEqual([0, 11]);
  });
  it('caps a huge time advance without losing precision', () => {
    const game = advanceGame(activateCard(createGame('np1-4-1'), 0), Number.MAX_SAFE_INTEGER);
    expect(game.elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each([[0, '0:00'], [999, '0:00'], [1000, '0:01'], [3599999, '59:59'],
    [3600000, '60:00'], [MAX_ELAPSED_MS, '5999:59']])('formats %i milliseconds', (ms, display) => {
    expect(formatTime(Number(ms))).toBe(display);
  });
});

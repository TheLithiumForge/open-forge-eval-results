import { expect, it } from 'vitest';
import { activateCard, advanceGame, createGame, formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';
import { SIZES } from './deal.ts';

function initial(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Missing test deal');
  return state;
}

it('starts on first reveal, ignores repeats and immediately matches', () => {
  const start = initial();
  expect(advanceGame(start, 1000)).toBe(start);
  const first = activateCard(start, 0);
  expect(first.started).toBe(true);
  expect(activateCard(first, 0)).toBe(first);
  const matched = activateCard(advanceGame(first, 1500), 11);
  expect(matched.matched).toEqual([0, 11]);
  expect(matched.moves).toBe(1);
  expect(matched.elapsedMs).toBe(1500);
  expect(activateCard(matched, 11)).toBe(matched);
  expect(start.matched).toEqual([]);
});

it('blocks a mismatch for precisely 800 active milliseconds', () => {
  const miss = activateCard(activateCard(initial(), 0), 1);
  expect(miss.moves).toBe(1);
  expect(activateCard(miss, 2)).toBe(miss);
  const waiting = advanceGame(miss, 799);
  expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  const closed = advanceGame(waiting, 1);
  expect(closed.selection.kind).toBe('closed');
  expect(activateCard(closed, 2).selection).toEqual({ kind: 'one', index: 2 });
});

it.each(SIZES)('completes size %i with one move per pair and stops its clock', size => {
  let game = createGame(`np1-${size}-1`);
  if (!game) throw new Error('Missing test deal');
  for (let face = 0; face < size ** 2 / 2; face++) {
    const first = game.deck.indexOf(face);
    const second = game.deck.lastIndexOf(face);
    game = activateCard(advanceGame(activateCard(game, first), 100), second);
  }
  expect(isWon(game)).toBe(true);
  expect(game.moves).toBe(size ** 2 / 2);
  expect(advanceGame(game, 5000)).toBe(game);
});

it('continues matching at the move and time caps', () => {
  const state = { ...initial(), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true };
  const matched = activateCard(activateCard(advanceGame(state, 9999), 0), 11);
  expect(matched.moves).toBe(MAX_MOVES);
  expect(matched.elapsedMs).toBe(MAX_ELAPSED_MS);
  expect(matched.matched).toEqual([0, 11]);
  expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
  expect(formatTime(3600000)).toBe('60:00');
  expect(formatTime(1999)).toBe('0:01');
});

it('ignores invalid activation positions', () => {
  const state = initial();
  for (const index of [-1, 16, 1.5, NaN]) expect(activateCard(state, index)).toBe(state);
});

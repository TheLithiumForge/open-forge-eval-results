import { expect, test } from 'vitest';
import { activateCard, advanceGame, createGame, formatTime, isWon, MAX_ELAPSED, MAX_MOVES } from './state.ts';
import { SIZES } from './boardCode.ts';

function initial(code = 'np1-4-1') {
  const game = createGame(code);
  if (!game) throw new Error('Invalid fixture');
  return game;
}
test('first reveal, repeated selection, immediate match and ignored matched card', () => {
  const start = initial();
  const one = activateCard(start, 0);
  expect(one.started).toBe(true);
  expect(one.moves).toBe(0);
  expect(activateCard(one, 0)).toBe(one);
  const pair = activateCard(one, 11);
  expect(pair.matched).toEqual([0, 11]);
  expect(pair.moves).toBe(1);
  expect(pair.selection.kind).toBe('closed');
  expect(activateCard(pair, 0)).toBe(pair);
  expect(start.selection.kind).toBe('closed');
  expect(start.matched).toEqual([]);
});
test('mismatch blocks activation and resolves exactly at 800 active milliseconds', () => {
  const miss = activateCard(activateCard(initial(), 0), 1);
  expect(miss.moves).toBe(1);
  expect(activateCard(miss, 2)).toBe(miss);
  const waiting = advanceGame(miss, 799);
  expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  expect(advanceGame(waiting, 1).selection.kind).toBe('closed');
  expect(advanceGame(miss, 5000).elapsedMs).toBe(5000);
});
test('clock starts at first activation and stops on victory; caps do not stop play', () => {
  expect(advanceGame(initial(), 9000).elapsedMs).toBe(0);
  const state = { ...activateCard(initial(), 0), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED - 1 };
  const pair = activateCard(advanceGame(state, 5000), 11);
  expect(pair.moves).toBe(MAX_MOVES);
  expect(pair.elapsedMs).toBe(MAX_ELAPSED);
  expect(pair.matched).toHaveLength(2);
  expect(formatTime(3600000)).toBe('60:00');
  expect(formatTime(MAX_ELAPSED)).toBe('5999:59');
});
test.each(SIZES)('completes a %i board with exactly one move per pair', size => {
  let state = initial(`np1-${size}-1`);
  const deck = state.board.deck;
  for (let face = 0; face < size * size / 2; face++) {
    state = activateCard(activateCard(state, deck.indexOf(face)), deck.lastIndexOf(face));
    state = advanceGame(state, 100);
  }
  expect(isWon(state)).toBe(true);
  expect(state.moves).toBe(size * size / 2);
  expect(advanceGame(state, 999999)).toBe(state);
});
test.each([-1, 16, 0.5, NaN, Infinity])('rejects out of range activation %s', index => {
  const state = initial();
  expect(activateCard(state, index)).toBe(state);
});

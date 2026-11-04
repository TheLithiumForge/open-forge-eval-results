import { expect, it } from 'vitest';
import { createGame, formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { SIZES } from './boardCode.ts';

function initial(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Fixture board failed');
  return state;
}
it('counts second valid reveals and matches immediately', () => {
  const start = initial();
  expect(advanceGame(start, 10000)).toBe(start);
  const first = activateCard(start, 0);
  expect(first.started).toBe(true);
  expect(first.moves).toBe(0);
  expect(activateCard(first, 0)).toBe(first);
  const match = activateCard(first, 11);
  expect(match.moves).toBe(1);
  expect(match.matched).toEqual([0, 11]);
  expect(match.selection).toEqual({ kind: 'closed' });
  expect(activateCard(match, 11)).toBe(match);
  expect(start.matched).toEqual([]);
});
it('blocks a mismatch and closes both cards at exactly 800 active milliseconds', () => {
  const miss = activateCard(activateCard(initial(), 0), 1);
  expect(activateCard(miss, 2)).toBe(miss);
  const waiting = advanceGame(miss, 799);
  expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  expect(advanceGame(waiting, 1).selection).toEqual({ kind: 'closed' });
  expect(advanceGame(waiting, 1).elapsedMs).toBe(800);
});
it.each(SIZES)('finishes size %i and stops the clock at the winning turn', size => {
  let state = createGame(`np1-${size}-1`);
  if (!state) throw new Error('Fixture board failed');
  for (let face = 0; face < size * size / 2; face++) {
    const first = state.board.deck.indexOf(face);
    const second = state.board.deck.lastIndexOf(face);
    state = activateCard(advanceGame(activateCard(state, first), 5), second);
  }
  expect(isWon(state)).toBe(true);
  expect(state.moves).toBe(size * size / 2);
  expect(advanceGame(state, 50000)).toBe(state);
});
it('continues at the move and elapsed caps and formats long times', () => {
  const start = { ...initial(), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS - 1, started: true };
  const miss = activateCard(activateCard(start, 0), 1);
  const after = advanceGame(miss, 800);
  expect(after.moves).toBe(MAX_MOVES);
  expect(after.elapsedMs).toBe(MAX_ELAPSED_MS);
  expect(after.selection.kind).toBe('closed');
  expect(activateCard(activateCard(after, 0), 11).matched).toHaveLength(2);
  expect(formatTime(3600000)).toBe('60:00');
  expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
});
it('ignores invalid activation indices and invalid time advances', () => {
  const state = activateCard(initial(), 0);
  for (const value of [-1, 16, 0.5, NaN, Infinity]) expect(activateCard(state, value)).toBe(state);
  for (const value of [-1, 0, NaN, Infinity]) expect(advanceGame(state, value)).toBe(state);
});
it('wins normally when both counters have reached their caps', () => {
  const state = { ...initial(), matched: [0, 11, 1, 9, 2, 6, 3, 7, 4, 5, 8, 15, 10, 14],
    selection: { kind: 'one' as const, index: 12 }, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true };
  const won = activateCard(state, 13);
  expect(isWon(won)).toBe(true);
  expect(won.moves).toBe(MAX_MOVES);
  expect(won.elapsedMs).toBe(MAX_ELAPSED_MS);
});

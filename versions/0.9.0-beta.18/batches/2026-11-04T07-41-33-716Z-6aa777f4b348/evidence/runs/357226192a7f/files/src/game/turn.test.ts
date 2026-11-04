import { expect, it } from 'vitest';
import { createGame, formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import { activateCard, advanceGame } from './turn.ts';

function initial() {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Invalid test board');
  return state;
}

it('starts on the first valid reveal and ignores repeats and invalid positions', () => {
  const state = initial();
  expect(advanceGame(state, 1000)).toBe(state);
  for (const index of [-1, 16, 0.5, NaN]) expect(activateCard(state, index)).toBe(state);
  const first = activateCard(state, 0);
  expect(first.started).toBe(true);
  expect(first.moves).toBe(0);
  expect(first.selection).toEqual({ kind: 'one', index: 0 });
  expect(activateCard(first, 0)).toBe(first);
});

it('matches immediately, costs one move, and ignores matched cards', () => {
  const state = activateCard(activateCard(initial(), 0), 11);
  expect(state.matched).toEqual([0, 11]);
  expect(state.moves).toBe(1);
  expect(state.selection).toEqual({ kind: 'closed' });
  expect(activateCard(state, 0)).toBe(state);
});

it('blocks mismatches for exactly 800 active milliseconds', () => {
  const state = activateCard(activateCard(initial(), 0), 1);
  expect(state.moves).toBe(1);
  expect(activateCard(state, 2)).toBe(state);
  const before = advanceGame(state, 799);
  expect(before.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  const after = advanceGame(before, 1);
  expect(after.selection).toEqual({ kind: 'closed' });
  expect(after.elapsedMs).toBe(800);
  expect(activateCard(after, 2).selection).toEqual({ kind: 'one', index: 2 });
});

it('keeps playing at move and clock caps', () => {
  const capped = { ...initial(), started: true, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
  const miss = activateCard(activateCard(capped, 0), 1);
  expect(miss.moves).toBe(MAX_MOVES);
  const closed = advanceGame(miss, Number.MAX_SAFE_INTEGER);
  expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
  expect(closed.selection.kind).toBe('closed');
  expect(activateCard(activateCard(closed, 0), 11).matched).toEqual([0, 11]);
});

it('stops at victory and never mutates earlier states', () => {
  const original = initial();
  let state = original;
  for (const face of new Set(original.deck)) {
    for (let i = 0; i < state.deck.length; i++) if (state.deck[i] === face) state = activateCard(state, i);
    state = advanceGame(state, 50);
  }
  expect(isWon(state)).toBe(true);
  expect(state.moves).toBe(8);
  expect(advanceGame(state, 1000)).toBe(state);
  expect(activateCard(state, 0)).toBe(state);
  expect(original.matched).toEqual([]);
  expect(original.selection.kind).toBe('closed');
});

it.each([[0, '0:00'], [999, '0:00'], [61000, '1:01'], [3600000, '60:00'],
  [359999999, '5999:59']])('formats %i as %s', (ms, expected) => {
  expect(typeof ms).toBe('number');
  if (typeof ms === 'number') expect(formatTime(ms)).toBe(expected);
});

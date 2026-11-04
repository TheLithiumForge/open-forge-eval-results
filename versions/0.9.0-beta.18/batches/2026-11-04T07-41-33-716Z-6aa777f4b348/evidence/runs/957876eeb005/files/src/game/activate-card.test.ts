import { expect, it } from 'vitest';
import { activateCard, MOVE_CAP } from './activate-card.ts';
import { createGame } from './create-game.ts';
import { SUPPORTED_SIZES } from './board-code.ts';
import { isWon } from './is-won.ts';

function initial(code = 'np1-4-1') {
  const state = createGame(code);
  if (state === null) throw new Error('Invalid fixture');
  return state;
}

it('reveals once, ignores repeated/invalid positions and counts the second card only', () => {
  const state = initial();
  expect(activateCard(state, -1)).toBe(state);
  expect(activateCard(state, 16)).toBe(state);
  expect(activateCard(state, 1.5)).toBe(state);
  const first = activateCard(state, 0);
  expect(first.selection).toEqual({ kind: 'one', index: 0 });
  expect(first.started).toBe(true);
  expect(first.moves).toBe(0);
  expect(activateCard(first, 0)).toBe(first);
  const matched = activateCard(first, 11);
  expect(matched.moves).toBe(1);
  expect(matched.matched).toEqual([0, 11]);
  expect(matched.selection).toEqual({ kind: 'closed' });
  expect(activateCard(matched, 0)).toBe(matched);
  expect(state.selection).toEqual({ kind: 'closed' });
  expect(state.matched).toEqual([]);
});

it('shows a miss for 800ms and ignores all activations during it', () => {
  const missed = activateCard(activateCard(initial(), 0), 1);
  expect(missed.moves).toBe(1);
  expect(missed.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
  expect(activateCard(missed, 11)).toBe(missed);
});

it('caps moves but keeps matching and allows victory', () => {
  let state = { ...initial(), moves: MOVE_CAP };
  for (let face = 0; face < 8; face += 1) {
    for (const [index, value] of state.deck.entries()) if (value === face) state = activateCard(state, index);
  }
  expect(state.moves).toBe(MOVE_CAP);
  expect(isWon(state)).toBe(true);
});

it('finishes every supported size in exactly one move per pair', () => {
  for (const size of SUPPORTED_SIZES) {
    let state = initial(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face += 1) {
      for (const [index, value] of state.deck.entries()) if (value === face) state = activateCard(state, index);
    }
    expect(state.moves).toBe(size * size / 2);
    expect(state.matched).toHaveLength(size * size);
    expect(isWon(state)).toBe(true);
    expect(state.selection).toEqual({ kind: 'closed' });
  }
});

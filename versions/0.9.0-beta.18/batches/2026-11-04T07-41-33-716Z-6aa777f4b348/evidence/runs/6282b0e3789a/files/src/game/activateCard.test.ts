import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { createGame } from './createGame.ts';
import { isWon, MAX_MOVES, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import { SUPPORTED_SIZES } from './boardCode.ts';

function initial(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test board.');
  return state;
}

describe('card transitions', () => {
  it('starts on the first valid activation and ignores repeated and invalid cards', () => {
    const state = initial();
    for (const index of [-1, 16, 0.5, NaN]) expect(activateCard(state, index)).toBe(state);
    const one = activateCard(state, 0);
    expect(one.selection).toEqual({ kind: 'one', index: 0 });
    expect(one.started).toBe(true);
    expect(one.moves).toBe(0);
    expect(activateCard(one, 0)).toBe(one);
    expect(state.selection).toEqual({ kind: 'closed' });
  });

  it('matches immediately, counts exactly one move, and ignores matched cards', () => {
    const state = activateCard(activateCard(initial(), 0), 11);
    expect(state.matched).toEqual([0, 11]);
    expect(state.selection).toEqual({ kind: 'closed' });
    expect(state.moves).toBe(1);
    expect(pairCount(state)).toBe(1);
    expect(activateCard(state, 11)).toBe(state);
  });

  it('blocks every card while a mismatch is pending', () => {
    const state = activateCard(activateCard(initial(), 0), 1);
    expect(state.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(state.moves).toBe(1);
    for (let index = 0; index < 16; index += 1) expect(activateCard(state, index)).toBe(state);
  });

  it('continues matching and wins after the move cap', () => {
    const state = { ...initial(), moves: MAX_MOVES };
    const matched = activateCard(activateCard(state, 0), 11);
    expect(matched.moves).toBe(MAX_MOVES);
    expect(pairCount(matched)).toBe(1);
  });

  it('completes every supported size with whole pairs and no extra score', () => {
    for (const size of SUPPORTED_SIZES) {
      let state = initial(`np1-${size}-1`);
      for (let face = 0; face < size * size / 2; face += 1) {
        const first = state.deck.indexOf(face);
        const second = state.deck.lastIndexOf(face);
        state = activateCard(activateCard(state, first), second);
      }
      expect(isWon(state)).toBe(true);
      expect(state.moves).toBe(size * size / 2);
      expect(pairCount(state)).toBe(size * size / 2);
      expect(state.selection).toEqual({ kind: 'closed' });
      expect(activateCard(state, 0)).toBe(state);
    }
  });
});

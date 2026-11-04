import { describe, expect, it } from 'vitest';
import { createGame, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import { activateCard, advanceGame, isWon } from './transitions.ts';
import { decodeSnapshot } from './snapshot.ts';

const game = (): NonNullable<ReturnType<typeof createGame>> => {
  const state = createGame('np1-4-1');
  if (state === null) throw new Error('Test board must be valid');
  return state;
};

describe('card and clock transitions', () => {
  it('ignores a repeated first card, matches immediately, and counts the second reveal', () => {
    const first = activateCard(game(), 0);
    expect(activateCard(first, 0)).toBe(first);
    expect(first.moves).toBe(0);
    const match = activateCard(first, 11);
    expect(match.moves).toBe(1);
    expect(match.matched).toEqual([0, 11]);
    expect(match.selection.kind).toBe('closed');
    expect(isWon(match)).toBe(false);
    expect(activateCard(match, 0)).toBe(match);
  });

  it('blocks activations during misses and closes both together at 800ms', () => {
    const miss = activateCard(activateCard(game(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(miss.selection.kind).toBe('mismatch');
    expect(activateCard(miss, 2)).toBe(miss);
    const before = advanceGame(miss, 799);
    expect(before.selection.kind).toBe('mismatch');
    expect(advanceGame(before, 1).selection.kind).toBe('closed');
  });

  it('caps moves and elapsed time while continuing turns and mismatch countdown', () => {
    const cappedMove = decodeSnapshot(JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [],
      selection: { kind: 'one', index: 0 }, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true }));
    expect(cappedMove).not.toBeNull();
    if (cappedMove !== null) {
      const miss = activateCard(cappedMove, 1);
      expect(miss.moves).toBe(MAX_MOVES);
      const elapsed = advanceGame(miss, 801);
      expect(elapsed.elapsedMs).toBe(MAX_ELAPSED_MS);
      expect(elapsed.selection.kind).toBe('closed');
      expect(activateCard(elapsed, 2).selection.kind).toBe('one');
    }
  });

  it('stops time at victory and ignores invalid or nonpositive intervals', () => {
    let state = game();
    for (let face = 0; face < 8; face += 1) {
      const positions = state.board.deck.flatMap((value, index) => value === face ? [index] : []);
      const first = positions[0];
      const second = positions[1];
      if (first !== undefined && second !== undefined) {
        state = activateCard(activateCard(state, first), second);
        state = advanceGame(state, 10);
      }
    }
    expect(isWon(state)).toBe(true);
    expect(advanceGame(state, 1000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
    const untouched = game();
    expect(advanceGame(untouched, Number.NaN)).toBe(untouched);
  });
});

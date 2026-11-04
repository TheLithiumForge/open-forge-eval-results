import { describe, expect, it } from 'vitest';
import { SELECTION } from './constants';
import { activateCard, advanceGame, createGame, isWon, pairCount } from './state';

describe('game transitions', () => {
  it('ignores a repeated first card and matches on the second distinct reveal', () => {
    const initial = createGame('np1-4-1');
    expect(initial).not.toBeNull();
    if (!initial) return;
    const one = activateCard(initial, 0);
    expect(one.started).toBe(true);
    expect(one.moves).toBe(0);
    expect(activateCard(one, 0)).toBe(one);
    const match = activateCard(one, 11);
    expect(match.moves).toBe(1);
    expect(match.matched).toEqual([0, 11]);
    expect(pairCount(match)).toBe(1);
  });

  it('closes a mismatch after exactly 800 active milliseconds', () => {
    const initial = createGame('np1-4-1');
    expect(initial).not.toBeNull();
    if (!initial) return;
    const mismatch = activateCard(activateCard(initial, 0), 1);
    expect(mismatch.moves).toBe(1);
    expect(mismatch.selection.kind).toBe(SELECTION.MISMATCH);
    expect(advanceGame(mismatch, 799).selection.kind).toBe(SELECTION.MISMATCH);
    const closed = advanceGame(mismatch, 800);
    expect(closed.selection.kind).toBe(SELECTION.CLOSED);
    expect(closed.elapsedMs).toBe(800);
  });

  it('ignores cards during a mismatch, then permits a new turn after it closes', () => {
    const initial = createGame('np1-4-1');
    expect(initial).not.toBeNull();
    if (!initial) return;
    const mismatch = activateCard(activateCard(initial, 0), 1);
    expect(activateCard(mismatch, 11)).toBe(mismatch);
    const closed = advanceGame(mismatch, 800);
    expect(activateCard(closed, 11).selection).toEqual({ kind: SELECTION.ONE, index: 11 });
  });

  it('derives completion only after every pair is matched', () => {
    let state = createGame('np1-4-1');
    expect(state).not.toBeNull();
    if (!state) return;
    expect(isWon(state)).toBe(false);
    for (let face = 0; face < 8; face += 1) {
      const indices = state.board.deck.flatMap((value, index) => value === face ? [index] : []);
      state = activateCard(activateCard(state, indices[0] ?? -1), indices[1] ?? -1);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(8);
  });
});

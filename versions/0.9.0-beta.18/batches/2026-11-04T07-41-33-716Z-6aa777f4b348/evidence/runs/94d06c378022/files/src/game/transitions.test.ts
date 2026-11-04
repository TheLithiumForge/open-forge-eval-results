import { describe, expect, it } from 'vitest';
import { createGame } from './createGame.ts';
import { MAX_ELAPSED_MS, MAX_MOVES, makeGameState } from './state.ts';
import { activateCard, advanceGame, isWon } from './transitions.ts';

const initial = createGame('np1-4-1');
if (initial === null) throw new Error('Test board is invalid');

describe('card transitions and logical time', () => {
  it('ignores repeats, matches immediately and ignores a matched card', () => {
    const first = activateCard(initial, 0);
    expect(first.selection).toEqual({ kind: 'one', index: 0 });
    expect(first.started).toBe(true);
    expect(activateCard(first, 0)).toBe(first);
    const matched = activateCard(first, 11);
    expect(matched.matched).toEqual([0, 11]);
    expect(matched.moves).toBe(1);
    expect(matched.selection).toEqual({ kind: 'closed' });
    expect(activateCard(matched, 0)).toBe(matched);
  });

  it('blocks a miss until its exact active-time deadline', () => {
    let state = activateCard(initial, 0);
    state = activateCard(state, 1);
    expect(state.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(state.moves).toBe(1);
    expect(activateCard(state, 11)).toBe(state);
    state = advanceGame(state, 799);
    expect(state.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    expect(state.elapsedMs).toBe(799);
    state = advanceGame(state, 1);
    expect(state.selection).toEqual({ kind: 'closed' });
    expect(state.elapsedMs).toBe(800);
  });

  it('caps moves and elapsed time while play continues', () => {
    const nearCap = makeGameState(initial.board, [], { kind: 'one', index: 0 }, MAX_MOVES - 1, MAX_ELAPSED_MS - 5, true);
    let state = activateCard(nearCap, 11);
    expect(state.moves).toBe(MAX_MOVES);
    state = advanceGame(state, 50);
    expect(state.elapsedMs).toBe(MAX_ELAPSED_MS);
    state = activateCard(state, 1);
    state = activateCard(state, 9);
    expect(state.moves).toBe(MAX_MOVES);
    expect(state.matched).toContain(1);
  });

  it('stops elapsed time after every pair is found', () => {
    let state = initial;
    const pairs = new Map<number, number[]>();
    state.board.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
    for (const pair of pairs.values()) {
      const first = pair[0];
      const second = pair[1];
      if (first === undefined || second === undefined) throw new Error('Incomplete fixture pair');
      state = activateCard(state, first);
      state = activateCard(state, second);
    }
    expect(isWon(state)).toBe(true);
    expect(advanceGame(state, 1000)).toBe(state);
  });
});

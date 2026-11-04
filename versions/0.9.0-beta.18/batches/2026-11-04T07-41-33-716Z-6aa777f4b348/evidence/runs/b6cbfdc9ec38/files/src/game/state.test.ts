import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { SIDES } from './boardCode.ts';
import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';

function game(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Invalid fixture.');
  return state;
}

function turn(state: GameState, first: number, second: number): GameState {
  return activateCard(activateCard(state, first), second);
}

describe('card turns and logical active time', () => {
  it('starts only on a valid reveal and ignores repeated and matched cards', () => {
    const initial = game();
    expect(advanceGame(initial, 500)).toBe(initial);
    for (const index of [-1, 16, 0.5, NaN]) expect(activateCard(initial, index)).toBe(initial);
    const one = activateCard(initial, 0);
    expect(one).toMatchObject({ started: true, moves: 0, selection: { kind: 'one', index: 0 } });
    expect(activateCard(one, 0)).toBe(one);
    const match = activateCard(one, 11);
    expect(match).toMatchObject({ matched: [0, 11], moves: 1, selection: { kind: 'closed' } });
    expect(activateCard(match, 11)).toBe(match);
    expect(initial.matched).toEqual([]);
    expect(initial.selection).toEqual({ kind: 'closed' });
  });

  it('counts each second reveal and closes a mismatch together at exactly 800 active ms', () => {
    const mismatch = turn(game(), 0, 1);
    expect(mismatch).toMatchObject({ moves: 1, selection: { kind: 'mismatch', remainingMs: 800 } });
    expect(activateCard(mismatch, 2)).toBe(mismatch);
    const waiting = advanceGame(mismatch, 799.75);
    expect(waiting.selection).toMatchObject({ kind: 'mismatch', remainingMs: 0.25 });
    const closed = advanceGame(waiting, 0.25);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
    expect(turn(closed, 4, 5)).toMatchObject({ moves: 2, matched: [4, 5] });
  });

  it('preserves fractions, caps clocks and moves, and still resolves turns at the cap', () => {
    const one = activateCard({ ...game(), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS - 0.5 }, 0);
    expect(advanceGame(one, 0.25).elapsedMs).toBe(MAX_ELAPSED_MS - 0.25);
    const mismatch = activateCard(advanceGame(one, 1), 1);
    expect(mismatch.moves).toBe(MAX_MOVES);
    const closed = advanceGame(mismatch, 800);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(turn(closed, 4, 5).matched).toEqual([4, 5]);
  });

  it.each(SIDES)('completes every pair at size %i and freezes elapsed time', (size) => {
    let state = createGame(`np1-${size}-1`);
    if (!state) throw new Error('Invalid fixture.');
    for (let face = 0; face < size * size / 2; face += 1) {
      const first = state.deck.indexOf(face);
      const second = state.deck.indexOf(face, first + 1);
      state = advanceGame(activateCard(state, first), 10);
      state = activateCard(state, second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(state.elapsedMs).toBe(size * size / 2 * 10);
    expect(advanceGame(state, 500)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });
});

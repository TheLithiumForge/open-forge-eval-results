import { describe, expect, it } from 'vitest';
import { SIZES } from './boardCode.ts';
import { createGame, isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame, MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';
import { formatTime } from './time.ts';

function fresh(size = 4): GameState {
  const state = createGame(`np1-${size}-1`);
  if (!state) throw new Error('Invalid test game');
  return state;
}

function reveal(state: GameState, ...indices: number[]): GameState {
  return indices.reduce(activateCard, state);
}

describe('card transitions and active logical time', () => {
  it('starts only on a valid reveal, ignores repeats, and matches immediately', () => {
    const initial = fresh();
    expect(advanceGame(initial, 1000)).toBe(initial);
    for (const index of [-1, 16, 0.5, NaN]) expect(activateCard(initial, index)).toBe(initial);
    const first = activateCard(initial, 0);
    expect(first).toMatchObject({ started: true, moves: 0, selection: { kind: 'one', index: 0 } });
    expect(activateCard(first, 0)).toBe(first);
    const matched = activateCard(first, 11);
    expect(matched).toMatchObject({ moves: 1, matched: [0, 11], selection: { kind: 'closed' } });
    expect(pairCount(matched)).toBe(1);
    expect(activateCard(matched, 0)).toBe(matched);
    expect(initial.matched).toEqual([]);
    expect(initial.selection).toEqual({ kind: 'closed' });
  });
  it('blocks a mismatch for exactly 800 active milliseconds', () => {
    const miss = reveal(fresh(), 0, 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799.5);
    expect(waiting.selection).toMatchObject({ kind: 'mismatch', remainingMs: 0.5 });
    expect(advanceGame(waiting, 0.5).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(miss, 1000)).toMatchObject({ elapsedMs: 1000, moves: 1, selection: { kind: 'closed' } });
  });
  it('caps elapsed time without blocking mismatch resolution', () => {
    const miss = reveal({ ...fresh(), elapsedMs: MAX_ELAPSED_MS, moves: MAX_MOVES }, 0, 1);
    const closed = advanceGame(miss, 800);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.moves).toBe(MAX_MOVES);
    expect(reveal(closed, 0, 11).matched).toEqual([0, 11]);
  });
  it.each(SIZES)('completes size %i and stops its clock', (size) => {
    let state = fresh(size);
    const byFace = new Map<number, number[]>();
    state.board.deck.forEach((face, index) => byFace.set(face, [...(byFace.get(face) ?? []), index]));
    for (const indices of byFace.values()) {
      state = reveal(advanceGame(state, 10), ...indices);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(pairCount(state)).toBe(size * size / 2);
    expect(advanceGame(state, 1000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });
  it('formats floor seconds and minutes beyond 59', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(61000)).toBe('1:01');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
  });
});

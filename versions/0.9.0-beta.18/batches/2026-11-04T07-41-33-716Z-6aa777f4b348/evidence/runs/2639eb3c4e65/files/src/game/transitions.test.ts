import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame } from './transitions.ts';
import { formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './model.ts';
import type { GameState } from './model.ts';
import { SIZES } from './deck.ts';

function initial(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Bad test code');
  return state;
}

describe('turns and logical active time', () => {
  it('starts on the first eligible reveal and ignores a repeated card', () => {
    const start = initial();
    expect(advanceGame(start, 1000)).toBe(start);
    const one = activateCard(start, 0);
    expect(one).toMatchObject({ started: true, moves: 0, selection: { kind: 'one', index: 0 } });
    expect(activateCard(one, 0)).toBe(one);
    const match = activateCard(one, 11);
    expect(match).toMatchObject({ matched: [0, 11], moves: 1, selection: { kind: 'closed' } });
    expect(activateCard(match, 0)).toBe(match);
    expect(start.matched).toEqual([]);
  });
  it('closes a mismatch together exactly at 800ms and blocks other activation', () => {
    const miss = activateCard(activateCard(initial(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
    expect(activateCard(closed, 2).selection).toEqual({ kind: 'one', index: 2 });
  });
  it('supports fractional time and caps without blocking play', () => {
    const one = { ...activateCard(initial(), 0), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS - 1 };
    const elapsed = advanceGame(one, 1.5);
    expect(elapsed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(activateCard(elapsed, 11)).toMatchObject({ moves: MAX_MOVES, matched: [0, 11] });
    expect(advanceGame(activateCard(elapsed, 1), 800).selection.kind).toBe('closed');
  });
  it.each(SIZES)('finishes size %s and stops the clock', size => {
    let state = initial(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face++) {
      for (const [index, id] of state.board.deck.entries()) if (id === face) state = activateCard(state, index);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(state.selection.kind).toBe('closed');
    expect(advanceGame(state, 10000)).toBe(state);
  });
  it.each([-1, 16, 1.5, NaN, Infinity])('ignores an invalid index %s', index => {
    const start = initial();
    expect(activateCard(start, index)).toBe(start);
  });
  it.each([[0, '0:00'], [999, '0:00'], [1000, '0:01'], [3600000, '60:00'], [MAX_ELAPSED_MS, '5999:59']])
    ('formats %s milliseconds', (ms, formatted) => expect(formatTime(Number(ms))).toBe(formatted));
});

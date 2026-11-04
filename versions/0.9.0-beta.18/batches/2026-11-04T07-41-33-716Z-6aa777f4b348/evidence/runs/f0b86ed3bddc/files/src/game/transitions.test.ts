import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { advanceGame, formatTime } from './advanceGame.ts';
import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, pairCount } from './state.ts';
import { SIZES } from './boardCode.ts';

const initial = () => createGame('np1-4-1');
describe('turns and active time', () => {
  it('starts on a valid reveal, ignores repeats and counts the second reveal', () => {
    const untouched = initial();
    expect(advanceGame(untouched, 5000)).toBe(untouched);
    for (const index of [-1, 16, 1.5, NaN]) expect(activateCard(untouched, index)).toBe(untouched);
    const one = activateCard(untouched, 0);
    expect(one.started).toBe(true);
    expect(activateCard(one, 0)).toBe(one);
    expect(one.moves).toBe(0);
    const matched = activateCard(one, 11);
    expect(matched.moves).toBe(1);
    expect(pairCount(matched)).toBe(1);
    expect(matched.selection).toEqual({ kind: 'closed' });
    expect(activateCard(matched, 0)).toBe(matched);
    expect(untouched.matched).toEqual([]);
    expect(untouched.selection).toEqual({ kind: 'closed' });
  });
  it('blocks a mismatch and closes both at exactly 800 active ms', () => {
    const mismatch = activateCard(activateCard(initial(), 0), 1);
    expect(mismatch.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(activateCard(mismatch, 11)).toBe(mismatch);
    const almost = advanceGame(mismatch, 799);
    expect(almost.selection).toMatchObject({ remainingMs: 1 });
    expect(advanceGame(almost, 1).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(almost, 1).elapsedMs).toBe(800);
  });
  it('caps moves and elapsed independently while play continues', () => {
    const one = { ...activateCard(initial(), 0), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
    const mismatch = activateCard(one, 1);
    expect(mismatch.moves).toBe(MAX_MOVES);
    const closed = advanceGame(mismatch, 800);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection.kind).toBe('closed');
    expect(pairCount(activateCard(activateCard(closed, 0), 11))).toBe(1);
  });
  it.each(SIZES)('finishes %ix%i with one point and one move per pair', size => {
    let state = createGame(`np1-${size}-1`);
    for (let face = 0; face < size ** 2 / 2; face++) {
      const first = state.board.deck.indexOf(face);
      const second = state.board.deck.lastIndexOf(face);
      state = activateCard(advanceGame(activateCard(state, first), 10), second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size ** 2 / 2);
    expect(pairCount(state)).toBe(state.moves);
    expect(advanceGame(state, 9999)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });
  it.each([[0, '0:00'], [59999, '0:59'], [60000, '1:00'], [3600000, '60:00'], [MAX_ELAPSED_MS, '5999:59']])
  ('formats %i ms as %s', (ms, text) => { expect(formatTime(ms)).toBe(text); });
});

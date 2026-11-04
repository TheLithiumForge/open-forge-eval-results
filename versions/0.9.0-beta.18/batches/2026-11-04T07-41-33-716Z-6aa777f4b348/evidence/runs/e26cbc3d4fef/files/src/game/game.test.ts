import { describe, expect, it } from 'vitest';
import { supportedSizes } from './boardCode.ts';
import { formatTime } from './format.ts';
import { activateCard, advanceGame, createGame, MAX_ELAPSED_MS, MAX_MOVES } from './game.ts';
import { isCardRevealed, isWon } from './state.ts';

describe('card transitions', () => {
  it('starts on first reveal, ignores repeated and out-of-range activation, and matches immediately', () => {
    const initial = createGame('np1-4-1');
    expect(advanceGame(initial, 2000)).toBe(initial);
    const first = activateCard(initial, 0);
    expect(first.selection).toEqual({ kind: 'one', index: 0 });
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    for (const index of [0, -1, 16, 1.5, NaN]) expect(activateCard(first, index)).toBe(first);
    const matched = activateCard(first, 11);
    expect(matched.matched).toEqual([0, 11]);
    expect(matched.moves).toBe(1);
    expect(matched.selection).toEqual({ kind: 'closed' });
    expect(activateCard(matched, 0)).toBe(matched);
    expect(initial.matched).toEqual([]);
    expect(initial.selection).toEqual({ kind: 'closed' });
  });

  it('blocks input during a mismatch and closes at exactly 800 active milliseconds', () => {
    const miss = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
    expect(miss.moves).toBe(1);
    expect(miss.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(activateCard(miss, 2)).toBe(miss);
    expect(isCardRevealed(miss, 0)).toBe(true);
    expect(isCardRevealed(miss, 1)).toBe(true);
    expect(isCardRevealed(miss, 2)).toBe(false);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
    expect(closed.moves).toBe(1);
    expect(isCardRevealed(closed, 0)).toBe(false);
  });

  it('caps moves and elapsed time while allowing matching and mismatch expiry', () => {
    const initial = { ...createGame('np1-4-1'), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true };
    const miss = activateCard(activateCard(initial, 0), 1);
    const closed = advanceGame(miss, 800);
    expect(closed.moves).toBe(MAX_MOVES);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection.kind).toBe('closed');
    const match = activateCard(activateCard(closed, 0), 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.moves).toBe(MAX_MOVES);
    let completed = match;
    for (let face = 0; face < 8; face += 1) {
      completed = activateCard(activateCard(completed, completed.deck.indexOf(face)), completed.deck.lastIndexOf(face));
    }
    expect(isWon(completed)).toBe(true);
    expect(completed.moves).toBe(MAX_MOVES);
    expect(advanceGame(activateCard(createGame('np1-4-1'), 0), Number.MAX_SAFE_INTEGER).elapsedMs)
      .toBe(MAX_ELAPSED_MS);
  });

  it.each(supportedSizes)('finishes a size %i game and stops its clock', (size) => {
    let state = createGame(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face += 1) {
      const first = state.deck.indexOf(face);
      const second = state.deck.lastIndexOf(face);
      state = activateCard(advanceGame(activateCard(state, first), 10), second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(state.matched).toHaveLength(size * size);
    expect(state.elapsedMs).toBe(size * size / 2 * 10);
    expect(advanceGame(state, 10000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });

  it('keeps fractional active time independent of render frequency', () => {
    const state = activateCard(createGame('np1-4-1'), 0);
    expect(advanceGame(advanceGame(state, 100.25), 899.75)).toEqual(advanceGame(state, 1000));
    for (const invalid of [0, -1, Infinity, NaN]) expect(advanceGame(state, invalid)).toBe(state);
  });
});

it('formats elapsed time by flooring seconds and allowing minutes beyond 59', () => {
  expect([0, 999, 1000, 59999, 60000, 3600000, MAX_ELAPSED_MS].map(formatTime))
    .toEqual(['0:00', '0:00', '0:01', '0:59', '1:00', '60:00', '5999:59']);
});

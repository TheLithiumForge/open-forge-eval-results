import { describe, expect, it } from 'vitest';
import { BOARD_SIZES } from './boardCode.ts';
import { isWon, pairCount } from './state.ts';
import { testGame } from './state.test-support.ts';
import { activateCard, advanceGame, MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';
import { formatTime } from './time.ts';

describe('card transitions', () => {
  it('starts with a first reveal; repeated reveals add no move', () => {
    const initial = testGame();
    const first = activateCard(initial, 0);
    expect(first.selection).toEqual({ kind: 'one', index: 0 });
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 0)).toBe(first);
    expect(initial.selection).toEqual({ kind: 'closed' });
    expect(first.board).toBe(initial.board);
  });

  it('matches immediately for one move and ignores matched positions', () => {
    const matched = activateCard(activateCard(testGame(), 0), 11);
    expect(matched.matched).toEqual([0, 11]);
    expect(matched.selection).toEqual({ kind: 'closed' });
    expect(matched.moves).toBe(1);
    expect(pairCount(matched)).toBe(1);
    expect(activateCard(matched, 11)).toBe(matched);
  });

  it('blocks during a mismatch and closes exactly at 800 active ms', () => {
    const miss = activateCard(activateCard(testGame(), 0), 1);
    expect(miss.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799.5);
    expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 0.5 });
    expect(advanceGame(waiting, 0.5).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(waiting, 0.5).elapsedMs).toBe(800);
  });

  it.each([-1, 16, 0.5, NaN, Infinity])('ignores invalid position %s', (index) => {
    const initial = testGame();
    expect(activateCard(initial, index)).toBe(initial);
  });

  it('keeps play working at the move cap', () => {
    const capped = { ...testGame(), moves: MAX_MOVES, started: true };
    const matched = activateCard(activateCard(capped, 0), 11);
    expect(matched.moves).toBe(MAX_MOVES);
    expect(pairCount(matched)).toBe(1);
  });

  it.each(BOARD_SIZES)('completes size %i in exactly one move per pair', (size) => {
    let state = testGame(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face += 1) {
      const first = state.board.deck.indexOf(face);
      const second = state.board.deck.lastIndexOf(face);
      state = activateCard(activateCard(state, first), second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(state.selection.kind).toBe('closed');
    expect(advanceGame(state, 3000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });
});

describe('active logical clock', () => {
  it('ignores time before the first activation and preserves fractional time', () => {
    const initial = testGame();
    expect(advanceGame(initial, 5000)).toBe(initial);
    const started = activateCard(initial, 0);
    expect(advanceGame(advanceGame(started, 0.25), 0.75).elapsedMs).toBe(1);
    for (const delta of [-1, 0, NaN, Infinity]) expect(advanceGame(started, delta)).toBe(started);
  });

  it('caps elapsed time while still resolving mismatches', () => {
    const miss = activateCard(activateCard(testGame(), 0), 1);
    const capped = advanceGame(miss, Number.MAX_SAFE_INTEGER);
    expect(capped.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(capped.selection.kind).toBe('closed');
    const nextMiss = activateCard(activateCard(capped, 2), 3);
    expect(advanceGame(nextMiss, 800).selection.kind).toBe('closed');
  });

  it.each([[0, '0:00'], [999, '0:00'], [1000, '0:01'], [61000, '1:01'],
    [3600000, '60:00'], [359999999, '5999:59']] satisfies [number, string][])(
    'formats %i ms as %s', (ms, expected) => expect(formatTime(ms)).toBe(expected),
  );
});

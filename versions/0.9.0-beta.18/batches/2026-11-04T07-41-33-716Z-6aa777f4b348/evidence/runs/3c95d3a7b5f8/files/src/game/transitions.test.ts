import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { GRID_SIZES } from './boardCode.ts';
import { createGame, formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES, pairCount } from './state.ts';

describe('turns and active time', () => {
  it('starts at the first eligible reveal and ignores repeated or invalid cards', () => {
    const initial = createGame('np1-4-1');
    expect(advanceGame(initial, 5000)).toBe(initial);
    for (const index of [-1, 16, 0.5, NaN]) expect(activateCard(initial, index)).toBe(initial);
    const first = activateCard(initial, 0);
    expect(first).toMatchObject({ started: true, moves: 0, selection: { kind: 'one', index: 0 } });
    expect(activateCard(first, 0)).toBe(first);
    expect(advanceGame(first, 1250).elapsedMs).toBe(1250);
    expect(initial.selection.kind).toBe('closed');
  });

  it('matches immediately with one move and no further activation on matched cards', () => {
    const initial = createGame('np1-4-1');
    const matched = activateCard(activateCard(initial, 0), 11);
    expect(matched).toMatchObject({ moves: 1, matched: [0, 11], selection: { kind: 'closed' } });
    expect(pairCount(matched)).toBe(1);
    expect(activateCard(matched, 11)).toBe(matched);
    expect(initial.matched).toEqual([]);
  });

  it('blocks mismatch activation until exactly 800 active milliseconds', () => {
    const mismatch = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
    expect(mismatch).toMatchObject({ moves: 1, selection: { kind: 'mismatch', remainingMs: 800 } });
    expect(activateCard(mismatch, 2)).toBe(mismatch);
    const pending = advanceGame(mismatch, 799.5);
    expect(pending.selection).toMatchObject({ kind: 'mismatch', remainingMs: 0.5 });
    expect(advanceGame(pending, 0.5).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(mismatch, 900).elapsedMs).toBe(900);
  });

  it('caps counters while allowing a mismatch to close and subsequent matches', () => {
    const first = { ...activateCard(createGame('np1-4-1'), 0), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
    const mismatch = activateCard(first, 1);
    expect(mismatch.moves).toBe(MAX_MOVES);
    const closed = advanceGame(mismatch, Number.MAX_SAFE_INTEGER);
    expect(closed.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(closed.selection.kind).toBe('closed');
    const match = activateCard(activateCard(closed, 0), 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.moves).toBe(MAX_MOVES);
  });

  it.each(GRID_SIZES)('finishes a complete %ix%i game and stops its clock', (size) => {
    let state = createGame(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face += 1) {
      state = activateCard(state, state.board.deck.indexOf(face));
      state = advanceGame(state, 10);
      state = activateCard(state, state.board.deck.lastIndexOf(face));
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(state.elapsedMs).toBe(size * size / 2 * 10);
    expect(advanceGame(state, 10000)).toBe(state);
  });

  it('formats minutes beyond 59 and ignores invalid time advances', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
    const first = activateCard(createGame('np1-4-1'), 0);
    for (const delta of [0, -1, NaN, Infinity]) expect(advanceGame(first, delta)).toBe(first);
  });
});

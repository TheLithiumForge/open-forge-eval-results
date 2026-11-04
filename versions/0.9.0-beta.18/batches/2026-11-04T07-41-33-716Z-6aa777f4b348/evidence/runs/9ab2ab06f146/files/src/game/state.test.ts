import { describe, expect, it } from 'vitest';
import { createGame, formatTime, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard } from './activate.ts';
import { advanceGame } from './advance.ts';
import { SIZES } from './board.ts';

function game(code = 'np1-4-1'): GameState {
  const result = createGame(code);
  if (!result) throw new Error('Invalid test code');
  return result;
}

describe('card transitions and logical time', () => {
  it('starts on the first valid reveal and ignores repeats and invalid indices', () => {
    const initial = game();
    expect(advanceGame(initial, 1000)).toBe(initial);
    expect(activateCard(initial, -1)).toBe(initial);
    const first = activateCard(initial, 0);
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 0)).toBe(first);
    const match = activateCard(first, 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.moves).toBe(1);
    expect(match.selection.kind).toBe('closed');
    expect(activateCard(match, 11)).toBe(match);
    expect(initial.matched).toEqual([]);
  });
  it('blocks a mismatch and closes both at exactly 800 active milliseconds', () => {
    const miss = activateCard(activateCard(game(), 0), 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 11)).toBe(miss);
    const almost = advanceGame(miss, 799);
    expect(almost.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(advanceGame(almost, 1).selection).toEqual({ kind: 'closed' });
    expect(activateCard(advanceGame(almost, 1), 11).selection).toEqual({ kind: 'one', index: 11 });
  });
  it('continues matching and closing at both caps', () => {
    const capped = { ...game(), started: true, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
    const miss = activateCard(activateCard(capped, 0), 1);
    expect(advanceGame(miss, 800)).toMatchObject({ moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, selection: { kind: 'closed' } });
    expect(activateCard(activateCard(capped, 0), 11).matched).toEqual([0, 11]);
    expect(advanceGame(activateCard(game(), 0), Number.MAX_SAFE_INTEGER).elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each(SIZES)('finishes size %i immediately and freezes the clock', size => {
    let state = game(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face++) {
      const positions = state.board.deck.flatMap((value, index) => value === face ? [index] : []);
      for (const position of positions) state = activateCard(state, position);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(advanceGame(state, 10000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });
  it('formats complete minutes and floors seconds', () => {
    expect([0, 999, 61000, 3600000, MAX_ELAPSED_MS].map(formatTime))
      .toEqual(['0:00', '0:00', '1:01', '60:00', '5999:59']);
  });
});

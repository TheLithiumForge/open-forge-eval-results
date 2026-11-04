import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { createGame } from './createGame.ts';
import { formatTime } from './formatTime.ts';
import { MAX_ELAPSED_MS } from './state.ts';
import type { GameState } from './state.ts';

function initial(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Invalid board.');
  return state;
}

describe('active logical time', () => {
  it('does not count before the first activation', () => {
    const state = initial();
    expect(advanceGame(state, 5000)).toBe(state);
    expect(advanceGame(activateCard(state, 0), 1234.5).elapsedMs).toBe(1234.5);
  });

  it('resolves a mismatch exactly at 800ms, regardless of update frequency', () => {
    const state = activateCard(activateCard(initial(), 0), 1);
    const waiting = advanceGame(state, 799);
    expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(advanceGame(waiting, 1)).toEqual(advanceGame(state, 800));
    expect(advanceGame(state, 800).selection).toEqual({ kind: 'closed' });
    expect(advanceGame(state, 850).elapsedMs).toBe(850);
  });

  it('caps elapsed time while mismatch time and later play keep working', () => {
    const state = activateCard(activateCard(initial(), 0), 1);
    const capped = advanceGame({ ...state, elapsedMs: MAX_ELAPSED_MS }, 800);
    expect(capped.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(capped.selection.kind).toBe('closed');
    expect(activateCard(capped, 2).selection).toEqual({ kind: 'one', index: 2 });
  });

  it('ignores invalid advances and stops at completion', () => {
    const state = activateCard(initial(), 0);
    for (const time of [0, -1, NaN, Infinity]) expect(advanceGame(state, time)).toBe(state);
    const complete = { ...state, matched: Array.from({ length: 16 }, (_, index) => index) };
    expect(advanceGame(complete, 800)).toBe(complete);
  });

  it.each([[0, '0:00'], [999, '0:00'], [1000, '0:01'], [60000, '1:00'],
    [3600000, '60:00'], [MAX_ELAPSED_MS, '5999:59']])('formats %d as %s', (time, text) => {
    expect(formatTime(Number(time))).toBe(text);
  });
});

import { expect, it } from 'vitest';
import { activateCard } from './activate-card.ts';
import { advanceGame, ELAPSED_CAP } from './advance-game.ts';
import { createGame } from './create-game.ts';
import { formatTime } from './format-time.ts';

function initial() {
  const state = createGame('np1-4-1');
  if (state === null) throw new Error('Invalid fixture');
  return state;
}

it('starts at the first reveal and does not advance before starting or after winning', () => {
  const closed = initial();
  expect(advanceGame(closed, 1000)).toBe(closed);
  const started = activateCard(closed, 0);
  expect(advanceGame(started, 1000).elapsedMs).toBe(1000);
  const won = { ...started, matched: Array.from({ length: 16 }, (_, i) => i) };
  expect(advanceGame(won, 1000)).toBe(won);
  expect(advanceGame(started, Number.NaN)).toBe(started);
  expect(advanceGame(started, -1)).toBe(started);
});

it('resolves mismatches exactly at the active-time boundary', () => {
  const missed = activateCard(activateCard(initial(), 0), 1);
  const waiting = advanceGame(missed, 799.5);
  expect(waiting.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 0.5 });
  const closed = advanceGame(waiting, 0.5);
  expect(closed.selection).toEqual({ kind: 'closed' });
  expect(closed.elapsedMs).toBe(800);
});

it('caps elapsed time independently from mismatch time', () => {
  const missed = activateCard(activateCard(initial(), 0), 1);
  const capped = advanceGame({ ...missed, elapsedMs: ELAPSED_CAP - 1 }, 800);
  expect(capped.elapsedMs).toBe(ELAPSED_CAP);
  expect(capped.selection.kind).toBe('closed');
});

it('formats whole seconds and unbounded minutes', () => {
  expect(formatTime(999)).toBe('0:00');
  expect(formatTime(61000)).toBe('1:01');
  expect(formatTime(3600000)).toBe('60:00');
  expect(formatTime(ELAPSED_CAP)).toBe('5999:59');
});

import { expect, it } from 'vitest';
import { activateCard } from '../activate-card.ts';
import { createGame } from '../create-game.ts';
import {
  advanceSession, isClockRunning, nextClockDelay, resumeSession, setSessionVisibility,
} from './active-time.ts';
import { initialSession } from './session-state.ts';
import { defaultPreferences } from './storage.ts';

function initial() {
  const game = createGame('np1-4-1');
  if (game === null) throw new Error('Invalid fixture');
  return initialSession(game, defaultPreferences(), 1000, true);
}

it('does not charge time before play and uses monotonic fractional active deltas', () => {
  const waiting = advanceSession(initial(), 5000);
  expect(waiting.game.elapsedMs).toBe(0);
  const revealed = { ...waiting, game: activateCard(waiting.game, 0) };
  const advanced = advanceSession(revealed, 5234.5);
  expect(advanced.game.elapsedMs).toBe(234.5);
  expect(advanceSession(advanced, 5200).game.elapsedMs).toBe(234.5);
  expect(isClockRunning(advanced)).toBe(true);
});

it('pauses both elapsed time and the mismatch on hide and resumes only remaining time', () => {
  const session = initial();
  const missed = { ...session, game: activateCard(activateCard(session.game, 0), 1) };
  const hidden = setSessionVisibility(missed, 1200, false);
  expect(hidden.game.elapsedMs).toBe(200);
  expect(hidden.game.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 600 });
  expect(isClockRunning(hidden)).toBe(false);
  const shown = setSessionVisibility(advanceSession(hidden, 8000), 10000, true);
  expect(shown.game.elapsedMs).toBe(200);
  expect(advanceSession(shown, 10599).game.selection.kind).toBe('mismatch');
  const closed = advanceSession(shown, 10600);
  expect(closed.game.selection.kind).toBe('closed');
  expect(closed.game.elapsedMs).toBe(800);
});

it('anchors Resume without charging imported-pause time and schedules near deadlines', () => {
  const session = initial();
  const missed = activateCard(activateCard(session.game, 0), 1);
  const paused = { ...session, paused: true, game: missed, loadStatus: 'Select Resume' };
  const held = advanceSession(paused, 9000);
  expect(held.game).toBe(missed);
  expect(isClockRunning(held)).toBe(false);
  const resumed = resumeSession(held, 10000);
  expect(resumed.paused).toBe(false);
  expect(resumed.loadStatus).toBe('');
  expect(advanceSession(resumed, 10800).game.selection.kind).toBe('closed');
  const almost = advanceSession(resumed, 10799.8);
  expect(nextClockDelay(almost)).toBe(1);
  expect(nextClockDelay(resumed)).toBe(100);
});

it('stops the session clock on completed games', () => {
  const session = initial();
  const game = { ...session.game, started: true, matched: Array.from({ length: 16 }, (_, i) => i) };
  const completed = { ...session, game };
  expect(isClockRunning(completed)).toBe(false);
  expect(advanceSession(completed, 10000).game).toBe(game);
});

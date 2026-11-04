import { expect, it } from 'vitest';
import { createGame } from '../create-game.ts';
import { advanceSession, resumeSession, setSessionVisibility } from './active-time.ts';
import { playCard } from './play-card.ts';
import { loadSnapshot } from './replace-game.ts';
import { initialSession } from './session-state.ts';
import { defaultPreferences } from './storage.ts';

function initial() {
  const game = createGame('np1-4-1');
  if (game === null) throw new Error('Invalid fixture');
  return initialSession(game, defaultPreferences(), 0, true);
}

it('announces exactly one result per turn and none for ignored actions or time renders', () => {
  const first = playCard(initial(), 0, 1000);
  expect(first.game.elapsedMs).toBe(0);
  expect(first.announcement.id).toBe(0);
  const ignored = playCard(first, 0, 1100);
  expect(ignored.announcement.id).toBe(0);
  const matched = playCard(ignored, 11, 1200);
  expect(matched.announcement).toEqual({ id: 1, text: 'Pair found. 1 pair matched.' });
  expect(matched.game.moves).toBe(1);
  expect(playCard(matched, 11, 1300).announcement).toBe(matched.announcement);
  const second = playCard(playCard(matched, 1, 1400), 9, 1500);
  expect(second.announcement).toEqual({ id: 2, text: 'Pair found. 2 pairs matched.' });
  expect(advanceSession(second, 1600).announcement).toBe(second.announcement);
});

it('announces consecutive identical misses separately and allows an exact-boundary action', () => {
  let session = playCard(playCard(initial(), 0, 0), 1, 0);
  expect(session.announcement.id).toBe(1);
  const blocked = playCard(session, 11, 799);
  expect(blocked.game.moves).toBe(1);
  expect(blocked.announcement.id).toBe(1);
  session = playCard(blocked, 0, 800);
  expect(session.game.selection).toEqual({ kind: 'one', index: 0 });
  session = playCard(session, 1, 800);
  expect(session.announcement).toEqual({ id: 2, text: 'No match. Cards close after a short pause.' });
  expect(advanceSession(session, 1600).announcement).toBe(session.announcement);
});

it('blocks all activation while an import is paused or the page is hidden', () => {
  const session = initial();
  const paused = { ...session, paused: true };
  expect(playCard(paused, 0, 1000).game).toBe(session.game);
  const hidden = setSessionVisibility(session, 1000, false);
  expect(playCard(hidden, 0, 2000).game).toBe(session.game);
  expect(playCard(paused, 0, 1000).announcement.id).toBe(0);
});

it('finishes resumed progress with one combined win result and records its local best', () => {
  const loaded = loadSnapshot(initial(), JSON.stringify({
    version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11),
    selection: { kind: 'one', index: 0 }, moves: 7, elapsedMs: 1500, started: true,
  }), 1000);
  expect(loaded.preferences.bests[4]).toBeUndefined();
  expect(playCard(loaded, 11, 2000).game.moves).toBe(7);
  const resumed = resumeSession(loaded, 3000);
  const won = playCard(resumed, 11, 3500);
  expect(won.game.moves).toBe(8);
  expect(won.game.elapsedMs).toBe(2000);
  expect(won.preferences.bests[4]).toBe(8);
  expect(won.celebrate).toBe(true);
  expect(won.announcement).toEqual({ id: 2, text: 'Pair found. All pairs found in 8 moves and 0:02.' });
  expect(playCard(won, 0, 4000).announcement).toBe(won.announcement);
  expect(advanceSession(won, 10000).game.elapsedMs).toBe(2000);
});

import { expect, it } from 'vitest';
import { activateCard } from '../activate-card.ts';
import { createGame } from '../create-game.ts';
import { advanceSession } from './active-time.ts';
import { loadBoard, loadSnapshot, replaceGame } from './replace-game.ts';
import { initialSession } from './session-state.ts';
import { defaultPreferences } from './storage.ts';

function game(code = 'np1-4-1') {
  const state = createGame(code);
  if (state === null) throw new Error('Invalid fixture');
  return state;
}
function initial() { return initialSession(game(), defaultPreferences(), 0, true); }

it('trims board control input, updates chosen size and replaces only valid deals', () => {
  const session = initial();
  const loaded = loadBoard(session, '  np1-6-123\n', 1000);
  expect(loaded.game.board.code).toBe('np1-6-123');
  expect(loaded.preferences.size).toBe(6);
  expect(loaded.game.moves).toBe(0);
  expect(loaded.dealId).toBe(session.dealId + 1);
  expect(loaded.loadStatus).toBe('Loaded board.');
  const invalid = loadBoard(loaded, 'np1-6-01', 2000);
  expect(invalid.game).toBe(loaded.game);
  expect(invalid.preferences).toBe(loaded.preferences);
  expect(invalid.dealId).toBe(loaded.dealId);
  expect(invalid.loadStatus).toBe('Invalid board code.');
  expect(invalid.announcement.id).toBe(loaded.announcement.id + 1);
});

it('loads the documented pending snapshot paused with its exact remaining time', () => {
  const loaded = loadSnapshot(initial(), JSON.stringify({
    version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true,
  }), 1000);
  expect(loaded.paused).toBe(true);
  expect(loaded.loadStatus).toBe('Loaded snapshot. Select Resume to continue.');
  const held = advanceSession(loaded, 9000);
  expect(held.game.elapsedMs).toBe(1500);
  expect(held.game.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 300 });
  const invalid = loadSnapshot(loaded, '{broken', 2000);
  expect(invalid.game).toBe(loaded.game);
  expect(invalid.preferences).toBe(loaded.preferences);
  expect(invalid.paused).toBe(true);
  expect(invalid.loadStatus).toBe('Invalid snapshot.');
});

it('imports completed snapshots without a pause, best update or celebration', () => {
  const session = { ...initial(), preferences: { size: 4, bests: { 4: 10 } } } as const;
  const loaded = loadSnapshot(session, JSON.stringify({
    version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, i) => i),
    selection: { kind: 'closed' }, moves: 8, elapsedMs: 2000, started: true,
  }), 1000);
  expect(loaded.paused).toBe(false);
  expect(loaded.celebrate).toBe(false);
  expect(loaded.preferences.bests[4]).toBe(10);
  expect(loaded.loadStatus).toBe('Loaded completed snapshot.');
  expect(advanceSession(loaded, 10000).game.elapsedMs).toBe(2000);
});

it('replaces a mismatch with a newly anchored deal and clears all turn progress', () => {
  const session = initial();
  const missed = { ...session, game: activateCard(activateCard(session.game, 0), 1) };
  const restarted = replaceGame(missed, game(), 500);
  const revealed = { ...restarted, game: activateCard(restarted.game, 0) };
  const later = advanceSession(revealed, 1000);
  expect(later.game.selection).toEqual({ kind: 'one', index: 0 });
  expect(later.game.moves).toBe(0);
  expect(later.game.matched).toEqual([]);
  expect(later.game.elapsedMs).toBe(500);
  expect(later.dealId).toBe(missed.dealId + 1);
});

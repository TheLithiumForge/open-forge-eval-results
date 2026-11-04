import { describe, expect, it } from 'vitest';
import { advanceGame, createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { loadBoard, loadSnapshot } from './loads.ts';
import { activateSession, initialSession, replaceSession } from './sessionState.ts';

function initial() {
  return initialSession(createGame('np1-4-1'), { size: 4, bests: {} });
}

describe('session announcements and deals', () => {
  it('announces only completed turns, including repeated identical misses once each', () => {
    const first = activateSession(initial(), 0);
    expect(first.announcement).toEqual({ id: 0, text: '' });
    expect(activateSession(first, 0)).toBe(first);
    const miss = activateSession(first, 1);
    expect(miss.announcement).toEqual({ id: 1, text: 'No match. Cards close after a short pause.' });
    expect(activateSession(miss, 2)).toBe(miss);
    const closed = { ...miss, game: advanceGame(miss.game, 800) };
    const again = activateSession(activateSession(closed, 0), 1);
    expect(again.announcement).toEqual({ id: 2, text: miss.announcement.text });
    const match = activateSession(activateSession(initial(), 0), 11);
    expect(match.announcement.text).toBe('Pair found. 1 pair matched.');
    expect(activateSession(activateSession(match, 1), 9).announcement.text).toBe('Pair found. 2 pairs matched.');
  });

  it('replaces the deal with a new revision even for the same board code', () => {
    const started = activateSession(initial(), 0);
    const restarted = replaceSession(started, createGame(started.game.board.code));
    expect(restarted.revision).toBe(started.revision + 1);
    expect(restarted.game.started).toBe(false);
    expect(restarted.game.moves).toBe(0);
    expect(restarted.celebrate).toBe(false);
  });

  it('loads trimmed codes, remembers their size and leaves game/preferences intact on errors', () => {
    const session = initial();
    const valid = loadBoard(session, '  np1-16-1\n');
    expect(valid.game.board.code).toBe('np1-16-1');
    expect(valid.preferences.size).toBe(16);
    expect(valid.loadStatus).toBe('Loaded board.');
    for (const invalid of [loadBoard(valid, 'np1-04-1'), loadSnapshot(valid, '{}')]) {
      expect(invalid.game).toBe(valid.game);
      expect(invalid.preferences).toBe(valid.preferences);
      expect(invalid.revision).toBe(valid.revision);
      expect(invalid.announcement.id).toBe(valid.announcement.id + 1);
    }
    expect(loadBoard(valid, 'bad').loadStatus).toBe('Invalid board code.');
    expect(loadSnapshot(valid, '{}').loadStatus).toBe('Invalid snapshot.');
  });
});

describe('import and completion', () => {
  it('pauses every unfinished import, including an unstarted game', () => {
    const loaded = loadSnapshot(initial(), encodeSnapshot(createGame('np1-4-1')));
    expect(loaded.paused).toBe(true);
    expect(loaded.loadStatus).toBe('Loaded snapshot. Select Resume to continue.');
    expect(activateSession(loaded, 0)).toBe(loaded);
  });

  it('keeps completed imports static and preserves best scores', () => {
    const session = { ...initial(), preferences: { size: 4, bests: { 4: 20 } } } as const;
    const completed = { ...session.game, matched: Array.from({ length: 16 }, (_, index) => index),
      moves: 8, started: true };
    const loaded = loadSnapshot(session, encodeSnapshot(completed));
    expect(loaded.paused).toBe(false);
    expect(loaded.celebrate).toBe(false);
    expect(loaded.preferences.bests[4]).toBe(20);
    expect(loaded.loadStatus).toBe('Loaded completed snapshot.');
  });

  it('records a best after finishing resumed progress, with one combined win announcement', () => {
    const game = { ...createGame('np1-4-1'), moves: 7, elapsedMs: 3600999, started: true,
      matched: Array.from({ length: 16 }, (_, index) => index).filter((index) => index !== 0 && index !== 11) };
    const loaded = loadSnapshot(initial(), encodeSnapshot(game));
    const resumed = { ...loaded, paused: false };
    const won = activateSession(activateSession(resumed, 0), 11);
    expect(won.preferences.bests[4]).toBe(8);
    expect(won.celebrate).toBe(true);
    expect(won.announcement).toEqual({ id: loaded.announcement.id + 1,
      text: 'Pair found. All pairs found in 8 moves and 60:00.' });
  });
});

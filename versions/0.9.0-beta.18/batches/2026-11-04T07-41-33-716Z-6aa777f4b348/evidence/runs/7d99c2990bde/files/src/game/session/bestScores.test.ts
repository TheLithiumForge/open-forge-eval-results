import { describe, expect, it } from 'vitest';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { SessionController } from './sessionController.ts';
import type { Preferences } from './storage.ts';

function initial(): GameState {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Expected board');
  return game;
}

function almostWon(moves: number): string {
  return encodeSnapshot({ ...initial(), started: true, moves,
    matched: Array.from({ length: 16 }, (_, index) => index).filter(index => index !== 0 && index !== 11) });
}

describe('local best scores and completion', () => {
  it.each([undefined, 20, 8, 7])('writes only an improved local best (previous %s)', previous => {
    const saves: Preferences[] = [];
    const c = new SessionController({ now: () => 0, fresh: initial,
      read: () => ({ size: 4, best: previous === undefined ? {} : { 4: previous } }),
      save: value => saves.push(value) }, true);
    c.loadSnapshot(almostWon(7));
    expect(c.view.best).toBe(previous ?? null);
    c.resume(); c.activate(0); c.activate(11);
    const expected = previous === undefined ? 8 : Math.min(previous, 8);
    expect(c.view.best).toBe(expected);
    expect(c.view.celebrate).toBe(true);
    expect(c.view.announcement?.text).toBe('Pair found. All pairs found in 8 moves and 0:00.');
    expect(saves).toHaveLength(previous === undefined || previous > 8 ? 2 : 1);
    c.tick(); c.activate(0);
    expect(saves).toHaveLength(previous === undefined || previous > 8 ? 2 : 1);
  });

  it('imports a completed game statically and preserves an existing best', () => {
    const saves: Preferences[] = [];
    const c = new SessionController({ now: () => 0, fresh: initial,
      read: () => ({ size: 4, best: { 4: 20 } }), save: value => saves.push(value) }, true);
    c.loadSnapshot(encodeSnapshot({ ...initial(), started: true, moves: 8,
      matched: Array.from({ length: 16 }, (_, index) => index) }));
    expect(c.view.paused).toBe(false);
    expect(c.view.celebrate).toBe(false);
    expect(c.view.best).toBe(20);
    expect(c.view.status).toBe('Loaded completed snapshot.');
    expect(saves).toHaveLength(1);
    expect(saves[0]?.best[4]).toBe(20);
  });
});

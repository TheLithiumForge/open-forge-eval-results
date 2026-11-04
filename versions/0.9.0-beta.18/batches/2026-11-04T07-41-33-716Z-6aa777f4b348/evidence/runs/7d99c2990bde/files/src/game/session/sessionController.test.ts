import { describe, expect, it } from 'vitest';
import { createGame, MAX_ELAPSED_MS } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { SessionController } from './sessionController.ts';
import { formatTime } from './formatTime.ts';
import type { Preferences } from './storage.ts';

function game(code = 'np1-4-1'): GameState {
  const value = createGame(code);
  if (!value) throw new Error('Invalid test board');
  return value;
}

function session(preferences: Preferences = { size: 4, best: {} }) {
  let now = 0;
  const saves: Preferences[] = [];
  const controller = new SessionController({ now: () => now,
    fresh: (size, old) => game(`np1-${size}-${old === undefined ? 1 : old + 1}`),
    read: () => preferences, save: value => saves.push(value) }, true);
  return { controller, saves, advance: (milliseconds: number) => { now += milliseconds; } };
}

describe('browser session active time and replacements', () => {
  it('starts time on first reveal and samples before an action or export', () => {
    const { controller: c, advance } = session();
    advance(2000); c.tick();
    expect(c.view.game.elapsedMs).toBe(0);
    c.activate(0);
    advance(1234);
    const exported = decodeSnapshot(c.exportSnapshot());
    expect(exported?.elapsedMs).toBe(1234);
    expect(c.active).toBe(true);
    advance(166); c.activate(11);
    expect(c.view.game.elapsedMs).toBe(1400);
    expect(c.view.game.moves).toBe(1);
    expect(c.view.announcement?.text).toBe('Pair found. 1 pair matched.');
  });

  it('samples the visible interval before hiding and resumes the remaining mismatch', () => {
    const { controller: c, advance } = session();
    c.activate(0); c.activate(1);
    advance(300); c.setVisible(false);
    expect(c.view.game.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 500 });
    advance(4000); c.tick(); c.setVisible(true);
    expect(c.view.game.elapsedMs).toBe(300);
    advance(499); c.tick();
    expect(c.view.game.selection.kind).toBe('mismatch');
    advance(1); c.activate(2);
    expect(c.view.game.selection).toEqual({ kind: 'one', index: 2 });
    expect(c.view.game.elapsedMs).toBe(800);
  });

  it('invalidates progress on restart and new deals without an earlier mismatch closing a new reveal', () => {
    const { controller: c, advance } = session();
    c.activate(0); c.activate(1); advance(400);
    c.restart();
    expect(c.view.revision).toBe(1);
    expect(c.view.game.board.code).toBe('np1-4-1');
    c.activate(2); advance(1000); c.tick();
    expect(c.view.game.selection).toEqual({ kind: 'one', index: 2 });
    expect(c.view.game.moves).toBe(0);
    c.newGame();
    expect(c.view.game.board.code).toBe('np1-4-2');
    expect(c.view.game.elapsedMs).toBe(0);
    c.changeSize(6);
    expect(c.view.game.board.size).toBe(6);
    expect(c.view.revision).toBe(3);
  });

  it('restores unfinished progress paused and excludes pause time from both clocks', () => {
    const { controller: c, advance } = session();
    const snapshot = { ...game(), matched: [0, 11], moves: 2, elapsedMs: 1500, started: true,
      selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 } as const };
    expect(c.loadSnapshot(encodeSnapshot(snapshot))).toBe(true);
    expect(c.view.status).toBe('Loaded snapshot. Select Resume to continue.');
    advance(9000); c.activate(4); c.tick();
    expect(c.view.game.elapsedMs).toBe(1500);
    expect(c.view.game.selection).toEqual(snapshot.selection);
    c.resume(); advance(299); c.tick();
    expect(c.view.game.selection.kind).toBe('mismatch');
    advance(1); c.tick();
    expect(c.view.game.selection.kind).toBe('closed');
    expect(c.view.game.elapsedMs).toBe(1800);
  });

  it('keeps announcements distinct at the move cap and quiet during clock ticks', () => {
    const { controller: c, advance } = session();
    c.loadSnapshot(encodeSnapshot({ ...game(), started: true, moves: 999999,
      elapsedMs: MAX_ELAPSED_MS, selection: { kind: 'closed' } }));
    c.resume(); c.activate(0); c.activate(1);
    const first = c.view.announcement;
    advance(800); c.tick();
    expect(c.view.announcement).toBe(first);
    c.activate(0); c.activate(1);
    expect(c.view.announcement?.text).toBe(first?.text);
    expect(c.view.announcement?.id).toBe((first?.id ?? 0) + 1);
    expect(c.view.game.elapsedMs).toBe(MAX_ELAPSED_MS);
  });

  it('keeps invalid loads atomic and saves size only on success', () => {
    const { controller: c, saves } = session();
    c.activate(0);
    const before = c.view.game;
    expect(c.loadBoard('np1-6-01')).toBe(false);
    expect(c.view.game).toBe(before);
    expect(c.view.status).toBe('Invalid board code.');
    expect(c.loadSnapshot('{}')).toBe(false);
    expect(c.view.game).toBe(before);
    expect(c.view.status).toBe('Invalid snapshot.');
    expect(saves).toHaveLength(0);
    expect(c.loadBoard('  np1-6-1\n')).toBe(true);
    expect(saves[0]?.size).toBe(6);
    expect(c.view.game.board.code).toBe('np1-6-1');
  });

  it('formats long clocks with unbounded minutes and whole seconds', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(MAX_ELAPSED_MS)).toBe('5999:59');
  });
});

import { describe, expect, it } from 'vitest';
import { createGame } from '../state.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { GameSession } from './dealActions.ts';
import { FakeBrowser } from './testing.ts';

describe('browser game session', () => {
  it('repeats, replaces, sizes and loads deals while preserving drafts and status events', () => {
    const browser = new FakeBrowser();
    const session = new GameSession(browser);
    session.start();
    session.changeSize(8);
    const sized = session.getSnapshot();
    expect(sized.game.board.boardCode).toBe('np1-8-2');
    session.activateCard(0);
    expect(session.getSnapshot().dealId).toBe(sized.dealId);
    const code = session.getSnapshot().game.board.boardCode;
    session.restart();
    expect(session.getSnapshot().game.board.boardCode).toBe(code);
    const restartId = session.getSnapshot().dealId;
    session.newGame();
    expect(session.getSnapshot().game.board.boardCode).not.toBe(code);
    expect(session.getSnapshot().dealId).toBe(restartId + 1);
    expect(session.loadBoard('  np1-4-1\n')).toBe(true);
    expect(session.getSnapshot().game.board.boardCode).toBe('np1-4-1');
    const loaded = session.getSnapshot();
    expect(loaded.status).toBe('Loaded board.');
    expect(loaded.announcement.text).toBe('Loaded board.');
    const serial = loaded.announcement.serial;
    session.activateCard(0);
    expect(session.getSnapshot().announcement.serial).toBe(serial);
    const beforeInvalid = session.getSnapshot();
    expect(session.loadBoard('np1-5-1')).toBe(false);
    expect(session.getSnapshot().game).toBe(beforeInvalid.game);
    expect(session.getSnapshot().status).toBe('Invalid board code.');
    expect(browser.storage.getItem('neon-pairs:preferences:v1')).toBe(JSON.stringify({ version: 1, size: 4 }));
    session.stop();
  });

  it('resolves a mismatch at exactly 800 active ms and before a boundary click', () => {
    const browser = new FakeBrowser();
    const session = new GameSession(browser);
    session.start();
    session.activateCard(0);
    browser.advanceBy(10);
    session.activateCard(1);
    expect(session.getSnapshot().game.selection.kind).toBe('mismatch');
    browser.advanceBy(799);
    const snapshotAtDeadline = session.exportSnapshot();
    const almost = session.getSnapshot().game.selection;
    expect(almost.kind).toBe('mismatch');
    expect(snapshotAtDeadline).toContain('"remainingMs": 1');
    browser.advanceBy(1);
    expect(session.getSnapshot().game.selection.kind).toBe('closed');

    session.activateCard(0);
    session.activateCard(1);
    browser.moveTimeWithoutRunningTimers(800);
    session.activateCard(2);
    expect(session.getSnapshot().game.selection).toEqual({ kind: 'one', index: 2 });
    browser.advanceBy(0);
    expect(session.getSnapshot().game.selection).toEqual({ kind: 'one', index: 2 });
    session.stop();
  });

  it('pauses the clock and mismatch while hidden and while an import awaits Resume', () => {
    const browser = new FakeBrowser();
    const session = new GameSession(browser);
    session.start();
    session.activateCard(0);
    session.activateCard(1);
    browser.advanceBy(300);
    browser.setVisible(false);
    const hidden = session.getSnapshot().game;
    browser.advanceBy(5000);
    expect(session.getSnapshot().game).toBe(hidden);
    browser.setVisible(true);
    browser.advanceBy(499);
    expect(session.getSnapshot().game.selection.kind).toBe('mismatch');
    browser.advanceBy(1);
    expect(session.getSnapshot().game.selection.kind).toBe('closed');

    const pending = JSON.stringify({
      version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'one', index: 0 },
      moves: 0, elapsedMs: 1000, started: true,
    });
    expect(session.loadSnapshot(pending)).toBe(true);
    const imported = session.getSnapshot();
    expect(imported.paused).toBe(true);
    expect(imported.status).toBe('Loaded snapshot. Select Resume to continue.');
    session.activateCard(11);
    expect(session.getSnapshot().game.selection).toEqual({ kind: 'one', index: 0 });
    browser.advanceBy(3000);
    expect(session.exportSnapshot()).toContain('"elapsedMs": 1000');
    session.resume();
    session.activateCard(11);
    expect(session.getSnapshot().game.moves).toBe(1);
    session.stop();
  });

  it('invalidates mismatch and interval callbacks when replacing a deal or stopping', () => {
    const browser = new FakeBrowser();
    const session = new GameSession(browser);
    session.start();
    session.activateCard(0);
    session.activateCard(1);
    session.restart();
    session.activateCard(0);
    session.activateCard(1);
    const currentTurn = session.getSnapshot().game;
    browser.invokeCanceledCallbacks();
    expect(session.getSnapshot().game).toBe(currentTurn);
    expect(session.getSnapshot().game.selection.kind).toBe('mismatch');
    session.stop();
    browser.invokeCanceledCallbacks();
    expect(session.getSnapshot().game).toBe(currentTurn);
  });

  it('announces repeated misses separately and records only a played victory', () => {
    const browser = new FakeBrowser();
    const session = new GameSession(browser);
    session.start();
    session.activateCard(0);
    session.activateCard(1);
    const first = session.getSnapshot().announcement;
    browser.advanceBy(800);
    session.activateCard(0);
    session.activateCard(1);
    const second = session.getSnapshot().announcement;
    expect(second.text).toBe(first.text);
    expect(second.serial).toBe(first.serial + 1);
    session.restart();

    const game = createGame('np1-4-1');
    if (game === null) throw new Error('Literal game code must be valid');
    for (let face = 0; face < 8; face += 1) {
      const firstPosition = game.deck.indexOf(face);
      const secondPosition = game.deck.lastIndexOf(face);
      session.activateCard(firstPosition);
      session.activateCard(secondPosition);
    }
    const won = session.getSnapshot();
    expect(won.game.moves).toBe(8);
    expect(won.best).toBe(8);
    expect(won.celebrating).toBe(true);
    expect(won.announcement.text).toContain('All pairs found in 8 moves');
    expect(browser.storage.getItem('neon-pairs:best-scores:v1')).toContain('"4":8');
    const completedSnapshot = encodeSnapshot(won.game);
    const restored = new GameSession(browser);
    restored.start();
    restored.loadSnapshot(completedSnapshot);
    expect(restored.getSnapshot().paused).toBe(false);
    expect(restored.getSnapshot().celebrating).toBe(false);
    browser.advanceBy(600);
    expect(session.getSnapshot().celebrating).toBe(false);
    restored.stop();
    session.stop();
  });
});

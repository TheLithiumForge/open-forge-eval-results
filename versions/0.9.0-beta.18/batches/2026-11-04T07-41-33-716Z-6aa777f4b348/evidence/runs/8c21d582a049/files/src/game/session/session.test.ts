import { describe, expect, it } from 'vitest';
import { GameSession } from './session.ts';
import { PREFERENCES_KEY } from './storage.ts';
import type { StoragePort } from './storage.ts';

function harness(storage: StoragePort | null = null) {
  let now = 0;
  const session = new GameSession({ now: () => now, seed: previous => previous === 1 ? 2 : 1, storage, visible: true });
  return { session, advance: (milliseconds: number) => { now += milliseconds; } };
}
const pending = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true });
const completed = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, i) => i),
  selection: { kind: 'closed' }, moves: 8, elapsedMs: 3000, started: true });

function win(session: GameSession): void {
  const deck = session.getView().game.board.deck;
  for (let face = 0; face < deck.length / 2; face++) {
    session.activate(deck.indexOf(face));
    session.activate(deck.lastIndexOf(face));
  }
}
function almostWon(moves: number): string {
  const matched = Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11);
  return JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched,
    selection: { kind: 'one', index: 0 }, moves, elapsedMs: 300, started: true });
}

describe('browser session time and transitions (A04, A06, R07–R12)', () => {
  it('counts monotonic active time independently of render frequency and pauses while hidden', () => {
    const { session, advance } = harness();
    advance(1234); session.tick();
    expect(session.getView().game.elapsedMs).toBe(0);
    session.activate(0); advance(0.75); session.activate(1);
    advance(300.25); session.setVisible(false);
    expect(session.getView().game.elapsedMs).toBe(301);
    expect(session.getView().game.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 499.75 });
    advance(5000); session.setVisible(true);
    advance(499.5); session.tick();
    expect(session.getView().game.selection.kind).toBe('mismatch');
    advance(0.25); session.tick();
    expect(session.getView().game.selection.kind).toBe('closed');
    expect(session.getView().game.elapsedMs).toBe(800.75);
  });
  it('clears pending turns on restart/new game and changes only fresh seeds', () => {
    const { session, advance } = harness();
    session.activate(0); session.activate(1); advance(500);
    const revision = session.getView().revision;
    session.restart();
    expect(session.getView().revision).toBe(revision + 1);
    expect(session.getView().game.board.code).toBe('np1-4-1');
    advance(500); session.activate(2); session.tick();
    expect(session.getView().game.selection).toEqual({ kind: 'one', index: 2 });
    expect(session.getView().game.moves).toBe(0);
    expect(session.getView().game.elapsedMs).toBe(0);
    advance(100);
    session.tick(revision);
    expect(session.getView().game.elapsedMs).toBe(0);
    session.tick();
    expect(session.getView().game.elapsedMs).toBe(100);
    session.newGame();
    expect(session.getView().game.board.code).toBe('np1-4-2');
    session.chooseSize(6);
    expect(session.getView().game.board.size).toBe(6);
  });
  it('loads unfinished snapshots paused and resumes their exact remaining active interval', () => {
    const { session, advance } = harness();
    expect(session.loadSnapshot(pending)).toBe(true);
    expect(session.getView().status).toBe('Loaded snapshot. Select Resume to continue.');
    advance(9000); session.tick(); session.activate(3);
    expect(session.getView().game.elapsedMs).toBe(1500);
    expect(session.getView().paused).toBe(true);
    session.resume(); advance(299); session.tick();
    expect(session.getView().game.selection.kind).toBe('mismatch');
    advance(1); session.tick();
    expect(session.getView().game.selection.kind).toBe('closed');
    expect(session.getView().game.elapsedMs).toBe(1800);
  });
  it('rejects invalid drafts without replacing the game or saving preferences', () => {
    const values = new Map<string, string>();
    const storage: StoragePort = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
    const { session } = harness(storage);
    session.activate(0);
    const game = session.getView().game;
    expect(session.loadBoard('np1-5-1')).toBe(false);
    expect(session.getView().status).toBe('Invalid board code.');
    expect(session.loadSnapshot('{}')).toBe(false);
    expect(session.getView().status).toBe('Invalid snapshot.');
    expect(session.getView().game).toBe(game);
    expect(values.size).toBe(0);
    expect(session.loadBoard('  np1-6-1\n')).toBe(true);
    expect(session.getView().game.board.size).toBe(6);
    expect(values.get(PREFERENCES_KEY)).toContain('"size":6');
  });
  it('exports current whole-millisecond progress without pausing or announcing a result', () => {
    const { session, advance } = harness();
    session.activate(0); session.activate(1); advance(799.75);
    const announcement = session.getView().announcement;
    expect(session.exportSnapshot()).toContain('"remainingMs": 1');
    expect(session.getView().announcement).toBe(announcement);
    expect(session.getView().paused).toBe(false);
    advance(0.25); session.tick();
    expect(session.getView().game.selection.kind).toBe('closed');
  });
});

describe('completion, records and announcements (R10, C12, I16)', () => {
  it('records a live win, stops elapsed time and emits one combined final result', () => {
    const { session, advance } = harness();
    win(session);
    expect(session.getView().best).toBe(8);
    expect(session.getView().celebrate).toBe(true);
    expect(session.getView().announcement.text).toBe('Pair found. All pairs found in 8 moves and 0:00.');
    const event = session.getView().announcement;
    advance(9000); session.tick(); session.activate(0);
    expect(session.getView().game.elapsedMs).toBe(0);
    expect(session.getView().announcement).toBe(event);
    session.restart();
    expect(session.getView().best).toBe(8);
  });
  it('never records or celebrates completed imports but does record later unfinished wins', () => {
    const { session } = harness();
    session.loadSnapshot(completed);
    expect(session.getView().best).toBeNull();
    expect(session.getView().paused).toBe(false);
    expect(session.getView().celebrate).toBe(false);
    expect(session.getView().status).toBe('Loaded completed snapshot.');
    session.loadSnapshot(almostWon(7));
    session.resume(); session.activate(11);
    expect(session.getView().best).toBe(8);
  });
  it('persists only improving live records and reloads a fresh deal with the remembered size', () => {
    const values = new Map<string, string>();
    let writes = 0;
    const storage: StoragePort = { getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); writes++; } };
    const { session } = harness(storage);
    const finish = (moves: number) => {
      session.loadSnapshot(almostWon(moves)); session.resume();
      const before = writes;
      session.activate(11);
      return writes - before;
    };
    expect(finish(9)).toBe(1);
    expect(session.getView().best).toBe(10);
    session.loadSnapshot(completed);
    expect(session.getView().best).toBe(10);
    expect(finish(9)).toBe(0);
    expect(finish(10)).toBe(0);
    expect(finish(7)).toBe(1);
    session.chooseSize(6);
    const reloaded = harness(storage).session;
    expect(reloaded.getView().game.board.size).toBe(6);
    expect(reloaded.getView().game.started).toBe(false);
    reloaded.chooseSize(4);
    expect(reloaded.getView().best).toBe(8);
  });
  it('gives identical consecutive misses distinct events without clock or expiry repeats', () => {
    const { session, advance } = harness();
    session.activate(0); session.activate(1);
    const first = session.getView().announcement;
    advance(800); session.tick();
    expect(session.getView().announcement).toBe(first);
    session.activate(0); session.activate(1);
    expect(session.getView().announcement.text).toBe(first.text);
    expect(session.getView().announcement.id).toBe(first.id + 1);
    session.activate(2); session.activate(0);
    expect(session.getView().announcement.id).toBe(first.id + 1);
  });
});

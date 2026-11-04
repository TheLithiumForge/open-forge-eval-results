import { describe, expect, it } from 'vitest';
import { createGame, MAX_ELAPSED_MS } from '../state.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { sessionFixture } from './sessionTest.ts';

function progress(moves = 7, completed = false): string {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid test fixture.');
  const matched = game.deck.flatMap((face, index) => face !== 3 || completed ? [index] : []);
  return encodeSnapshot({ ...game, matched, moves, elapsedMs: 1500, started: true });
}

describe('session replacement, snapshots and local records', () => {
  it('pauses unfinished imports, blocks cards and resumes without counting paused time', () => {
    const { session, elapse, tick, disconnect } = sessionFixture();
    const draft = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],'
      + '"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},'
      + '"moves":2,"elapsedMs":1500,"started":true}';
    expect(session.loadSnapshot(draft)).toBe(true);
    expect(session.getView()).toMatchObject({ paused: true, loadStatus: 'Loaded snapshot. Select Resume to continue.' });
    session.activate(3); elapse(5000);
    expect(session.exportSnapshot()).toBe(encodeSnapshot(session.getView().game));
    expect(session.getView().game.elapsedMs).toBe(1500);
    session.resume(); tick(299);
    expect(session.getView().game.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    tick(1);
    expect(session.getView()).toMatchObject({ paused: false, loadStatus: '', game: { elapsedMs: 1800, selection: { kind: 'closed' } } });
    disconnect();
  });

  it('also pauses an unstarted import and starts its clock on the first resumed reveal', () => {
    const { session, elapse, disconnect } = sessionFixture();
    session.loadSnapshot(session.exportSnapshot());
    expect(session.getView().paused).toBe(true);
    session.activate(0); elapse(9000); session.resume(); elapse(9000);
    session.activate(0); elapse(125);
    session.exportSnapshot();
    expect(session.getView().game.elapsedMs).toBe(125);
    disconnect();
  });

  it('loads a completed game statically without changing the best or stopping later wins', () => {
    const { session, saved, elapse, disconnect } = sessionFixture({ size: 4, best: { 4: 9 } });
    session.loadSnapshot(progress(8, true));
    expect(session.getView()).toMatchObject({ paused: false, celebrate: false, best: 9, loadStatus: 'Loaded completed snapshot.' });
    expect(saved.at(-1)?.best[4]).toBe(9);
    session.loadSnapshot(progress()); session.resume(); session.activate(8); elapse(600); session.activate(15);
    expect(session.getView()).toMatchObject({ celebrate: true, best: 8, game: { moves: 8, elapsedMs: 2100 } });
    expect(session.getView().announcement?.text).toBe('Pair found. All pairs found in 8 moves and 0:02.');
    expect(saved.at(-1)?.best[4]).toBe(8);
    disconnect();
  });

  it.each([8, 9])('keeps an existing record for equal or worse final moves from %i', (moves) => {
    const { session, saved, disconnect } = sessionFixture({ size: 4, best: { 4: 9 } });
    session.loadSnapshot(progress(moves)); session.resume();
    const writes = saved.length;
    session.activate(8); session.activate(15);
    expect(session.getView().best).toBe(9);
    expect(saved.length).toBe(writes);
    disconnect();
  });

  it('keeps gameplay and preference size when either load fails', () => {
    const { session, saved, disconnect } = sessionFixture();
    session.activate(0);
    const before = session.getView();
    expect(session.loadBoard('np1-6-01')).toBe(false);
    expect(session.getView()).toMatchObject({ game: before.game, revision: 0, loadStatus: 'Invalid board code.' });
    expect(session.loadSnapshot('{}')).toBe(false);
    expect(session.getView().game).toBe(before.game);
    expect(session.getView().loadStatus).toBe('Invalid snapshot.');
    expect(saved).toHaveLength(0);
    disconnect();
  });

  it('saves successful size loads and starts fresh deals while Restart preserves the code', () => {
    const { session, saved, disconnect } = sessionFixture({ size: 6, best: { 6: 20 } });
    expect(session.getView().game.board.size).toBe(6);
    session.loadBoard('  np1-8-7  ');
    expect(saved.at(-1)?.size).toBe(8);
    session.activate(0); session.restart();
    expect(session.getView().game).toMatchObject({ board: { code: 'np1-8-7' }, moves: 0, started: false });
    session.newGame();
    expect(session.getView().game.board.code).not.toBe('np1-8-7');
    const revision = session.getView().revision;
    session.chooseSize(8);
    expect(session.getView().revision).toBe(revision);
    session.chooseSize(6);
    expect(session.getView()).toMatchObject({ best: 20, game: { board: { size: 6 } } });
    disconnect();
  });

  it('keeps the mismatch interval running even at the elapsed cap', () => {
    const { session, tick, disconnect } = sessionFixture();
    const game = createGame('np1-4-1');
    if (!game) throw new Error('Invalid fixture.');
    session.loadSnapshot(encodeSnapshot({ ...game, started: true, moves: 1, elapsedMs: MAX_ELAPSED_MS,
      selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 } }));
    session.resume(); tick(300);
    expect(session.getView().game).toMatchObject({ elapsedMs: MAX_ELAPSED_MS, selection: { kind: 'closed' } });
    disconnect();
  });
});

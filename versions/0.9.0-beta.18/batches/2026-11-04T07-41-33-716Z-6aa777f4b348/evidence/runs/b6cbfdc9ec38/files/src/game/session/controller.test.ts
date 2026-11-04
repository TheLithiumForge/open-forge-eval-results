import { describe, expect, it } from 'vitest';
import { decodeSnapshot } from '../snapshot.ts';
import { sessionFixture } from './sessionTest.ts';

describe('active browser session timing', () => {
  it('samples a monotonic clock at actions and export, independent of render timers', () => {
    const { session, elapse, disconnect } = sessionFixture();
    elapse(5000);
    session.activate(0);
    elapse(100.25);
    session.activate(1);
    elapse(12.25);
    const snapshot = decodeSnapshot(session.exportSnapshot());
    expect(snapshot).toMatchObject({ elapsedMs: 112, selection: { kind: 'mismatch', remainingMs: 788 } });
    expect(session.getView().game.elapsedMs).toBe(112.5);
    expect(session.getView().game.selection).toMatchObject({ remainingMs: 787.75 });
    elapse(787.75);
    session.activate(2);
    expect(session.getView().game).toMatchObject({ moves: 1, selection: { kind: 'one', index: 2 } });
    disconnect();
  });

  it('pauses both clocks while hidden and continues the exact remaining interval', () => {
    const { session, elapse, hide, tick, disconnect, pending } = sessionFixture();
    session.activate(0); session.activate(1);
    elapse(250); hide(true);
    expect(session.getView().game).toMatchObject({ elapsedMs: 250, selection: { remainingMs: 550 } });
    expect(pending.size).toBe(0);
    elapse(5000); hide(false);
    tick(549);
    expect(session.getView().game.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    tick(1);
    expect(session.getView().game).toMatchObject({ elapsedMs: 800, selection: { kind: 'closed' } });
    disconnect();
  });

  it.each(['restart', 'newGame'] as const)('invalidates old callbacks on %s and unmount', (action) => {
    const { session, callbacks, elapse, disconnect, pending } = sessionFixture();
    session.activate(0); session.activate(1);
    const old = callbacks.at(-1);
    session[action]();
    session.activate(2);
    elapse(1000);
    old?.();
    expect(session.getView().game).toMatchObject({ moves: 0, elapsedMs: 0, selection: { kind: 'one', index: 2 } });
    disconnect();
    const stopped = session.getView();
    for (const callback of callbacks) callback();
    expect(session.getView()).toBe(stopped);
    expect(pending.size).toBe(0);
  });

  it('keeps each announcement stable through clock samples and creates an event per identical miss', () => {
    const { session, tick, disconnect } = sessionFixture();
    session.activate(0); session.activate(1);
    const first = session.getView().announcement;
    tick(800);
    expect(session.getView().announcement).toBe(first);
    session.activate(0); session.activate(1);
    expect(session.getView().announcement?.text).toBe(first?.text);
    expect(session.getView().announcement?.id).toBe((first?.id ?? 0) + 1);
    disconnect();
  });
});

import { describe, expect, it } from 'vitest';
import { activateCard } from '../transitions.ts';
import { createGame } from '../state.ts';
import { ActiveClock } from './activeClock.ts';
import { FakeBrowser } from './testing.ts';

describe('active clock', () => {
  it('subtracts synchronous processing time from a mismatch deadline', () => {
    const browser = new FakeBrowser();
    const initial = createGame('np1-4-1');
    if (initial === null) throw new Error('Literal game code must be valid');
    let game = activateCard(activateCard(initial, 0), 1);
    let firstWrite = true;
    const clock = new ActiveClock(
      {
        now: () => browser.now(),
        setInterval: () => () => undefined,
        setTimeout: (callback, milliseconds) => browser.setTimeout(callback, milliseconds),
        isVisible: () => browser.isVisible(),
        onVisibilityChange: (callback) => browser.onVisibilityChange(callback),
        storage: browser.storage,
        randomSeed: () => browser.randomSeed(),
      },
      () => game,
      () => 1,
      () => false,
      (next) => {
        game = next;
        if (firstWrite) {
          firstWrite = false;
          browser.moveTimeWithoutRunningTimers(50);
        }
      },
    );
    clock.start();

    browser.moveTimeWithoutRunningTimers(100);
    clock.syncNow();
    expect(game.selection).toMatchObject({ kind: 'mismatch', remainingMs: 700 });

    browser.advanceBy(649);
    expect(game.selection.kind).toBe('mismatch');
    browser.advanceBy(1);
    expect(game.selection.kind).toBe('closed');
    clock.stop();
  });
});

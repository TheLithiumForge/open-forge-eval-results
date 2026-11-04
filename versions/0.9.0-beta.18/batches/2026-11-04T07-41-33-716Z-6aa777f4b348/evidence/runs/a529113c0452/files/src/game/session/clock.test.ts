import { describe, expect, it } from 'vitest';
import { activateCard, createGame } from '../state.ts';
import { createActiveClock } from './clock.ts';

function mismatch() {
  const game = createGame('np1-4-1');
  if (game === null) throw new Error('Invalid test deal.');
  return activateCard(activateCard(game, 0), 1);
}

describe('active session time', () => {
  it('accounts for fractional active time through hidden and resumed intervals', () => {
    const clock = createActiveClock(0, true);
    let game = clock.setVisible(mismatch(), false, 250.5, false);
    expect(game.elapsedMs).toBe(250.5);
    game = clock.advance(game, false, 5000);
    game = clock.setVisible(game, false, 6000, true);
    expect(game.elapsedMs).toBe(250.5);
    game = clock.advance(game, false, 6549.25);
    expect(game.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 0.25 });
    game = clock.advance(game, false, 6549.5);
    expect(game.selection).toEqual({ kind: 'closed' });
    expect(game.elapsedMs).toBe(800);
  });

  it('discards paused import time and starts from the remaining interval on resume', () => {
    const clock = createActiveClock(0, true);
    let game = clock.advance(mismatch(), true, 5000);
    expect(game.elapsedMs).toBe(0);
    clock.reset(7000, true);
    game = clock.advance(game, false, 7799);
    expect(game.selection.kind).toBe('mismatch');
    game = clock.advance(game, false, 7800);
    expect(game.selection.kind).toBe('closed');
    expect(game.elapsedMs).toBe(800);
  });

  it('reset anchors a new deal without carrying the previous deal time', () => {
    const clock = createActiveClock(0, true);
    clock.advance(mismatch(), false, 799);
    clock.reset(799, true);
    const next = clock.advance(mismatch(), false, 800);
    expect(next.elapsedMs).toBe(1);
    expect(next.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 799 });
  });
});

import { describe, expect, it } from 'vitest';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, ELAPSED_CAP } from '../transitions.ts';
import { accountActiveTime } from './activeTime.ts';

function mismatch(): GameState {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid fixture');
  return activateCard(activateCard(game, 0), 1);
}

describe('active browser time', () => {
  it('accounts full monotonic deltas independently of render frequency', () => {
    const game = mismatch();
    const once = accountActiveTime(game, { atMs: 100, visible: true }, 900, false);
    const early = accountActiveTime(game, { atMs: 100, visible: true }, 399.25, false);
    expect(accountActiveTime(early.game, early.clock, 900, false)).toEqual(once);
    expect(once.game).toMatchObject({ elapsedMs: 800, selection: { kind: 'closed' } });
  });

  it('freezes both clocks while hidden, then continues their remaining time', () => {
    const hiding = accountActiveTime(mismatch(), { atMs: 0, visible: true }, 300, false);
    const hidden = accountActiveTime(hiding.game, { ...hiding.clock, visible: false }, 5300, false);
    expect(hidden.game).toBe(hiding.game);
    const returning = { ...hidden.clock, visible: true };
    const almost = accountActiveTime(hidden.game, returning, 5799, false);
    expect(almost.game).toMatchObject({ elapsedMs: 799, selection: { remainingMs: 1 } });
    expect(accountActiveTime(almost.game, almost.clock, 5800, false).game.selection.kind).toBe('closed');
  });

  it('keeps imported progress frozen until resume without charging its pause time', () => {
    const paused = accountActiveTime(mismatch(), { atMs: 100, visible: true }, 10000, true);
    expect(paused.game.elapsedMs).toBe(0);
    const resumed = accountActiveTime(paused.game, paused.clock, 10800, false);
    expect(resumed.game).toMatchObject({ elapsedMs: 800, selection: { kind: 'closed' } });
  });

  it('continues mismatch deadlines after elapsed cap and ignores clock rewind', () => {
    const game = { ...mismatch(), elapsedMs: ELAPSED_CAP };
    expect(accountActiveTime(game, { atMs: 0, visible: true }, 800, false).game)
      .toMatchObject({ elapsedMs: ELAPSED_CAP, selection: { kind: 'closed' } });
    expect(accountActiveTime(game, { atMs: 100, visible: true }, 90, false))
      .toEqual({ game, clock: { atMs: 100, visible: true } });
  });
});

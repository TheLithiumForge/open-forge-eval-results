import { describe, expect, it } from 'vitest';
import { activateCard } from '../activateCard.ts';
import { createGame } from '../state.ts';
import { sampleActiveGame } from './activeTime.ts';

describe('browser active-time sampling', () => {
  it('uses the same monotonic delta for elapsed time and mismatch expiry', () => {
    const game = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
    const clock = { atMs: 1000, visible: true };
    const pending = sampleActiveGame(game, false, clock, 1250);
    expect(pending.elapsedMs).toBe(250);
    expect(pending.selection).toMatchObject({ remainingMs: 550 });
    clock.atMs = 1250;
    clock.visible = false;
    expect(sampleActiveGame(pending, false, clock, 10000)).toBe(pending);
    clock.atMs = 10000;
    clock.visible = true;
    expect(sampleActiveGame(pending, false, clock, 10549).selection).toMatchObject({ remainingMs: 1 });
    expect(sampleActiveGame(pending, false, clock, 10550).selection).toEqual({ kind: 'closed' });
    expect(sampleActiveGame(pending, false, clock, 10550).elapsedMs).toBe(800);
  });

  it('leaves imported pauses and sampled/exported state untouched', () => {
    const game = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
    const clock = { atMs: 100, visible: true };
    expect(sampleActiveGame(game, true, clock, 5100)).toBe(game);
    clock.atMs = 5100;
    const sample = sampleActiveGame(game, false, clock, 5200);
    expect(sample.elapsedMs).toBe(100);
    expect(game.elapsedMs).toBe(0);
    expect(game.selection).toMatchObject({ remainingMs: 800 });
    expect(clock.atMs).toBe(5100);
  });

  it('starts fresh deals at their own anchor and ignores backwards samples', () => {
    const old = activateCard(createGame('np1-4-1'), 0);
    const replacement = activateCard(createGame('np1-4-2'), 1);
    expect(sampleActiveGame(old, false, { atMs: 100, visible: true }, 200).elapsedMs).toBe(100);
    const clock = { atMs: 200, visible: true };
    expect(sampleActiveGame(replacement, false, clock, 250).elapsedMs).toBe(50);
    expect(sampleActiveGame(replacement, false, clock, 199)).toBe(replacement);
  });
});

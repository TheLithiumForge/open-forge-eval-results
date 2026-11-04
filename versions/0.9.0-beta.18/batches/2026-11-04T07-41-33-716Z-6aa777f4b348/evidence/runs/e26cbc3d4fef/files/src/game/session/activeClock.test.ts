import { expect, it } from 'vitest';
import { activateCard, advanceGame, createGame } from '../game.ts';
import { sampleActiveClock } from './activeClock.ts';
import { freshSeed } from './deal.ts';
import { MAX_SEED } from '../boardCode.ts';

it('counts the same active time across hidden and paused intervals for the clock and mismatch', () => {
  let game = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
  let clock = { at: 100, active: true };
  for (const [at, active] of [[300, false], [5300, true], [5500, false], [9500, true], [9900, true]] as const) {
    const sample = sampleActiveClock(clock, at, active);
    clock = sample.clock;
    game = advanceGame(game, sample.milliseconds);
  }
  expect(game.elapsedMs).toBe(800);
  expect(game.selection.kind).toBe('closed');
});

it('keeps fractional time independent of sampling and does not double count a clock sample', () => {
  const initial = { at: 0, active: true };
  const first = sampleActiveClock(initial, 100.25, true);
  const same = sampleActiveClock(first.clock, 100.25, true);
  const final = sampleActiveClock(same.clock, 1000, true);
  expect(first.milliseconds + same.milliseconds + final.milliseconds).toBe(1000);
  expect(same.milliseconds).toBe(0);
  expect(sampleActiveClock(final.clock, 900, true).milliseconds).toBe(0);
});

it('chooses an in-range seed different from the previous one even when randomness repeats', () => {
  expect(freshSeed(undefined, () => 0)).toBe(1);
  expect(freshSeed(1, () => 0)).toBe(2);
  expect(freshSeed(undefined, () => 1 - Number.EPSILON)).toBe(MAX_SEED);
  expect(freshSeed(MAX_SEED, () => 1 - Number.EPSILON)).toBe(1);
});

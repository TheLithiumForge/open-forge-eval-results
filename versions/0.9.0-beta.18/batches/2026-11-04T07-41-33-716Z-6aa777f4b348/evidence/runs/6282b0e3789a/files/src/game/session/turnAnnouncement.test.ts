import { describe, expect, it } from 'vitest';
import { activateCard } from '../activateCard.ts';
import { advanceGame } from '../advanceGame.ts';
import { createGame } from '../createGame.ts';
import type { GameState } from '../state.ts';
import { turnAnnouncement } from './turnAnnouncement.ts';

function game(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Invalid test code.');
  return state;
}

describe('turn announcements', () => {
  it('announces one result after a matching second reveal', () => {
    const before = activateCard(game(), 0);
    const after = activateCard(before, 11);
    expect(turnAnnouncement(before, after)).toBe('Pair found. 1 pair matched.');
    const next = activateCard(after, 1);
    expect(turnAnnouncement(next, activateCard(next, 9))).toBe('Pair found. 2 pairs matched.');
  });

  it('keeps identical misses as separate available results', () => {
    const before = activateCard(game(), 0);
    const miss = activateCard(before, 1);
    const first = turnAnnouncement(before, miss);
    const next = activateCard(advanceGame(miss, 800), 0);
    const second = turnAnnouncement(next, activateCard(next, 1));
    expect(first).toBe('No match. Cards close after a short pause.');
    expect(second).toBe(first);
  });

  it('does not announce first reveals, repeated cards, blocked input or clock updates', () => {
    const initial = game();
    const first = activateCard(initial, 0);
    const miss = activateCard(first, 1);
    expect(turnAnnouncement(initial, first)).toBeNull();
    expect(turnAnnouncement(first, activateCard(first, 0))).toBeNull();
    expect(turnAnnouncement(miss, activateCard(miss, 2))).toBeNull();
    expect(turnAnnouncement(miss, advanceGame(miss, 800))).toBeNull();
  });

  it('combines the final pair and victory with the final clock and capped moves', () => {
    const initial = game();
    const before: GameState = {
      ...initial, matched: initial.deck.flatMap((_, i) => i === 0 || i === 11 ? [] : [i]),
      selection: { kind: 'one', index: 0 }, started: true, moves: 999999, elapsedMs: 3600999,
    };
    expect(turnAnnouncement(before, activateCard(before, 11)))
      .toBe('Pair found. All pairs found in 999999 moves and 60:00.');
  });
});

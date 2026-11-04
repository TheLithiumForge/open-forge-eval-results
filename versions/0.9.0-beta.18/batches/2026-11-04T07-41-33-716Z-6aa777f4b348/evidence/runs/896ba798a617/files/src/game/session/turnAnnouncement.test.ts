import { describe, expect, it } from 'vitest';
import { activateCard } from '../activateCard.ts';
import { createGame } from '../state.ts';
import { turnAnnouncement } from './turnAnnouncement.ts';

describe('turn announcements', () => {
  it('emits no result for a first card or ignored action', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid fixture');
    const one = activateCard(initial, 0);
    expect(turnAnnouncement(initial, one)).toBeNull();
    expect(turnAnnouncement(one, activateCard(one, 0))).toBeNull();
  });
  it('uses the exact first match and miss messages', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid fixture');
    const one = activateCard(initial, 0);
    expect(turnAnnouncement(one, activateCard(one, 11))).toBe('Pair found. 1 pair matched.');
    expect(turnAnnouncement(one, activateCard(one, 1))).toBe('No match. Cards close after a short pause.');
  });
  it('combines the final match and win into one result', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid fixture');
    const nearly = { ...initial, matched: Array.from({ length: 16 }, (_, i) => i).filter((i) => i !== 0 && i !== 11),
      moves: 7, elapsedMs: 61000, started: true };
    const one = activateCard(nearly, 0);
    expect(turnAnnouncement(one, activateCard(one, 11))).toBe('Pair found. All pairs found in 8 moves and 1:01.');
  });
});

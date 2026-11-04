import { describe, expect, it } from 'vitest';
import { activateCard } from '../activateCard.ts';
import { createGame } from '../state.ts';
import { turnAnnouncement } from './announcements.ts';
import { formatTime } from './formatTime.ts';

describe('session display text', () => {
  it.each([[0, '0:00'], [1999, '0:01'], [3600000, '60:00'], [359999999, '5999:59']] as const)
    ('formats %i active milliseconds as %s', (milliseconds, expected) => {
      expect(formatTime(milliseconds)).toBe(expected);
    });

  it('announces only completed turns with exact singular/plural text', () => {
    const game = createGame('np1-4-1');
    if (!game) throw new Error('Invalid fixture.');
    const first = activateCard(game, 0);
    expect(turnAnnouncement(game, first)).toBeNull();
    expect(turnAnnouncement(first, activateCard(first, 0))).toBeNull();
    const matched = activateCard(first, 11);
    expect(turnAnnouncement(first, matched)).toBe('Pair found. 1 pair matched.');
    const next = activateCard(matched, 1);
    expect(turnAnnouncement(next, activateCard(next, 9))).toBe('Pair found. 2 pairs matched.');
  });
});

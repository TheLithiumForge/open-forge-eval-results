import { expect, it } from 'vitest';
import { createGame } from '../state.ts';
import { activateCard } from '../activate.ts';
import { advanceGame } from '../advance.ts';
import { turnAnnouncement } from './announcements.ts';

it('announces results once per turn, including results at the move cap', () => {
  const initial = createGame('np1-4-1');
  if (!initial) throw new Error('Invalid test board');
  const first = activateCard(initial, 0);
  const match = activateCard(first, 11);
  expect(turnAnnouncement(initial, first)).toBeNull();
  expect(turnAnnouncement(first, match)).toBe('Pair found. 1 pair matched.');
  const miss = activateCard(activateCard(match, 1), 2);
  expect(turnAnnouncement(match, miss)).toBe('No match. Cards close after a short pause.');
  expect(turnAnnouncement(miss, advanceGame(miss, 800))).toBeNull();
  expect(turnAnnouncement(first, first)).toBeNull();
  const capped = { ...first, moves: 999999 };
  expect(turnAnnouncement(capped, activateCard(capped, 1))).toBe('No match. Cards close after a short pause.');
});

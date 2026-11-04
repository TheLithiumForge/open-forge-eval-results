import { expect, it } from 'vitest';
import { createGame, MAX_MOVES } from '../state.ts';
import { activateCard } from '../transitions.ts';
import { turnAnnouncement } from './announcements.ts';

it('announces a result even after moves have reached the cap', () => {
  const initial = { ...createGame('np1-4-1'), moves: MAX_MOVES };
  const one = activateCard(initial, 0);
  expect(turnAnnouncement(initial, one)).toBeNull();
  const miss = activateCard(one, 1);
  expect(turnAnnouncement(one, miss)).toBe('No match. Cards close after a short pause.');
  expect(turnAnnouncement(miss, activateCard(miss, 2))).toBeNull();
});

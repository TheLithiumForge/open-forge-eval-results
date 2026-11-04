import { expect, it } from 'vitest';
import { createGame } from '../state.ts';
import { activateCard } from '../transitions.ts';
import { turnAnnouncement } from './announcements.ts';

function initial() {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid fixture code.');
  return game;
}

it('announces a turn once and stays silent for the first reveal and ignored selection', () => {
  const game = initial();
  const one = activateCard(game, 0);
  expect(turnAnnouncement(game, one)).toBeNull();
  expect(turnAnnouncement(one, activateCard(one, 0))).toBeNull();
  expect(turnAnnouncement(one, activateCard(one, 11))).toBe('Pair found. 1 pair matched.');
  expect(turnAnnouncement(one, activateCard(one, 1))).toBe('No match. Cards close after a short pause.');
});

it('combines the last match and victory into one exact announcement', () => {
  const base = initial();
  const before = {
    ...base, matched: base.board.deck.flatMap((_, index) => index === 0 || index === 11 ? [] : [index]),
    selection: { kind: 'one' as const, index: 0 }, started: true, moves: 7, elapsedMs: 3600123,
  };
  expect(turnAnnouncement(before, activateCard(before, 11)))
    .toBe('Pair found. All pairs found in 8 moves and 60:00.');
});

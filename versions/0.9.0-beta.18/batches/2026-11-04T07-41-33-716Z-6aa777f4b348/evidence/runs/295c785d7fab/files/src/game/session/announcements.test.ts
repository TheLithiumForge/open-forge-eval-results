import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame } from '../state.ts';
import { turnAnnouncement } from './announcements.ts';
import { formatTime } from './formatTime.ts';

describe('turn announcements and displayed time', () => {
  it('announces results only, including repeated misses and the winning match', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid fixture.');
    const first = activateCard(initial, 0);
    expect(turnAnnouncement(initial, first)).toBeNull();
    expect(turnAnnouncement(first, activateCard(first, 0))).toBeNull();
    const missed = activateCard(first, 1);
    expect(turnAnnouncement(first, missed)).toBe('No match. Cards close after a short pause.');
    const closed = advanceGame(missed, 800);
    const again = activateCard(closed, 0);
    expect(turnAnnouncement(again, activateCard(again, 1))).toBe('No match. Cards close after a short pause.');
    let state = initial;
    for (const [firstIndex, secondIndex] of [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]]) {
      if (firstIndex === undefined || secondIndex === undefined) throw new Error('Invalid pair fixture.');
      const before = activateCard(state, firstIndex);
      state = activateCard(before, secondIndex);
      const count = state.matched.length / 2;
      expect(turnAnnouncement(before, state)).toBe(count === 8 ? 'Pair found. All pairs found in 8 moves and 0:00.'
        : `Pair found. ${count} ${count === 1 ? 'pair' : 'pairs'} matched.`);
    }
  });
  it('floors seconds and allows minutes beyond an hour', () => {
    expect(formatTime(999.9)).toBe('0:00');
    expect(formatTime(61000)).toBe('1:01');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(359999999)).toBe('5999:59');
  });
});

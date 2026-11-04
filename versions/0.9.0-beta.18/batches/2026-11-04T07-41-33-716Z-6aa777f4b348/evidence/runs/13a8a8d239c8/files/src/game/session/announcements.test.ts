import { describe, expect, it } from 'vitest';
import { activateCard, createGame } from '../state.ts';
import { turnAnnouncement } from './announcements.ts';

describe('turn announcements', () => {
  it('reports misses and match counts once per completed turn', () => {
    const initial = createGame('np1-4-1');
    if (initial === null) throw new Error('Expected a valid board.');
    const first = activateCard(initial, 0);
    const miss = activateCard(first, 1);
    expect(turnAnnouncement(first, miss)?.text).toBe('No match. Cards close after a short pause.');
    const oneCard = activateCard(initial, 0);
    const match = activateCard(oneCard, 11);
    expect(turnAnnouncement(oneCard, match)?.text).toBe('Pair found. 1 pair matched.');
    expect(turnAnnouncement(initial, oneCard)).toBeNull();
  });

  it('combines the final match with the win and elapsed time', () => {
    const initial = createGame('np1-4-1');
    if (initial === null) throw new Error('Expected a valid board.');
    let game = initial;
    for (let index = 0; index < initial.board.deck.length; index += 1) {
      if (game.matched.includes(index)) continue;
      const partner = initial.board.deck.findIndex((face, other) => other !== index && face === initial.board.deck[index]);
      const before = activateCard(game, index);
      const after = activateCard(before, partner);
      const result = turnAnnouncement(before, after);
      if (after.matched.length === initial.board.deck.length) {
        expect(result?.text).toBe('Pair found. All pairs found in 8 moves and 0:00.');
        expect(result?.completed).toBe(true);
      }
      game = after;
    }
  });
});

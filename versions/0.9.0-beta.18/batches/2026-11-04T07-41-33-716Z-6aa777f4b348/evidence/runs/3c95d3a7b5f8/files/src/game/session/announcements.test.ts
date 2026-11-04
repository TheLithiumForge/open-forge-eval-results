import { describe, expect, it } from 'vitest';
import { activateCard } from '../activateCard.ts';
import { advanceGame } from '../advanceGame.ts';
import { createGame } from '../state.ts';
import { nextAnnouncement, turnAnnouncement } from './announcements.ts';

describe('turn announcement events', () => {
  it('reports only second valid activations and never mismatch expiry', () => {
    const initial = createGame('np1-4-1');
    const first = activateCard(initial, 0);
    const mismatch = activateCard(first, 1);
    expect(turnAnnouncement(initial, first)).toBeNull();
    expect(turnAnnouncement(first, activateCard(first, 0))).toBeNull();
    expect(turnAnnouncement(first, mismatch)).toBe('No match. Cards close after a short pause.');
    expect(turnAnnouncement(mismatch, advanceGame(mismatch, 800))).toBeNull();
  });

  it('provides new event identities for consecutive identical messages', () => {
    const first = nextAnnouncement({ id: 0, text: '' }, 'No match. Cards close after a short pause.');
    const second = nextAnnouncement(first, first.text);
    expect(second.text).toBe(first.text);
    expect(second.id).toBe(first.id + 1);
  });

  it('combines the final pair and victory in one event using the active clock', () => {
    let game = createGame('np1-4-1');
    for (let face = 0; face < 8; face += 1) {
      const first = activateCard(game, game.board.deck.indexOf(face));
      const after = activateCard(first, game.board.deck.lastIndexOf(face));
      expect(turnAnnouncement(first, after)).toBe(face === 0 ? 'Pair found. 1 pair matched.'
        : face === 7 ? 'Pair found. All pairs found in 8 moves and 0:00.'
          : `Pair found. ${face + 1} pairs matched.`);
      game = after;
    }
  });
});

import { describe, expect, it } from 'vitest';
import { activateCard, createGame } from '../state.ts';
import { announce, turnResult } from './announcements.ts';

function initial() {
  const game = createGame('np1-4-1');
  if (game === null) throw new Error('Invalid test deal.');
  return game;
}

describe('turn announcements', () => {
  it('announces a second reveal and ignores first/repeated reveals', () => {
    const hidden = initial();
    const one = activateCard(hidden, 0);
    expect(turnResult(hidden, one)).toBeNull();
    expect(turnResult(one, activateCard(one, 0))).toBeNull();
    expect(turnResult(one, activateCard(one, 1))).toBe('No match. Cards close after a short pause.');
    const matched = activateCard(one, 11);
    expect(turnResult(one, matched)).toBe('Pair found. 1 pair matched.');
    const next = activateCard(matched, 1);
    expect(turnResult(next, activateCard(next, 9))).toBe('Pair found. 2 pairs matched.');
  });

  it('gives identical consecutive results distinct event identities', () => {
    const first = announce({ id: 0, text: '' }, 'No match. Cards close after a short pause.');
    const second = announce(first, first.text);
    expect(second.text).toBe(first.text);
    expect(second.id).toBe(first.id + 1);
  });

  it('combines the last match and win into one announcement', () => {
    let game = initial();
    let message: string | null = null;
    for (let face = 0; face < 8; face += 1) {
      const one = activateCard(game, game.board.deck.indexOf(face));
      game = activateCard(one, game.board.deck.lastIndexOf(face));
      message = turnResult(one, game);
    }
    expect(message).toBe('Pair found. All pairs found in 8 moves and 0:00.');
  });
});

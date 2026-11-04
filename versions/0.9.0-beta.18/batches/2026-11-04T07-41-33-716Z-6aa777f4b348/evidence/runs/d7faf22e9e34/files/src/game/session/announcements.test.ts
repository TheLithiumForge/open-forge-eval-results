import { describe, expect, it } from 'vitest';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame, MOVE_CAP } from '../transitions.ts';
import { turnAnnouncement } from './announcements.ts';

function initial(): GameState {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid fixture');
  return game;
}

describe('turn announcements', () => {
  it('announces matches with correct grammar and misses once', () => {
    const one = activateCard(initial(), 0);
    const match = activateCard(one, 11);
    expect(turnAnnouncement(one, match)).toBe('Pair found. 1 pair matched.');
    const next = activateCard(match, 1);
    expect(turnAnnouncement(next, activateCard(next, 9))).toBe('Pair found. 2 pairs matched.');
    const miss = activateCard(next, 2);
    expect(turnAnnouncement(next, miss)).toBe('No match. Cards close after a short pause.');
    expect(turnAnnouncement(miss, advanceGame(miss, 800))).toBeNull();
  });

  it('ignores first reveals, repeated cards and clock updates', () => {
    const game = initial();
    const one = activateCard(game, 0);
    expect(turnAnnouncement(game, one)).toBeNull();
    expect(turnAnnouncement(one, activateCard(one, 0))).toBeNull();
    expect(turnAnnouncement(one, advanceGame(one, 100))).toBeNull();
  });

  it('announces valid turns even when moves have reached the cap', () => {
    const one = activateCard({ ...initial(), moves: MOVE_CAP, started: true }, 0);
    expect(turnAnnouncement(one, activateCard(one, 1))).toBe('No match. Cards close after a short pause.');
  });

  it('combines the final match and win in a single result', () => {
    const game = initial();
    const unfinished: GameState = { ...game, started: true, moves: 7, elapsedMs: 61500,
      matched: Array.from({ length: 16 }, (_, index) => index).filter((index) => index !== 0 && index !== 11) };
    const one = activateCard(unfinished, 0);
    expect(turnAnnouncement(one, activateCard(one, 11)))
      .toBe('Pair found. All pairs found in 8 moves and 1:01.');
  });
});

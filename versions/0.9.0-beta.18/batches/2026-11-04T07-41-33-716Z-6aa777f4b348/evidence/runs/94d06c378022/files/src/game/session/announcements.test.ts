import { describe, expect, it } from 'vitest';
import { createGame } from '../createGame.ts';
import { MAX_MOVES, makeGameState, SELECTION_KIND } from '../state.ts';
import { activateCard } from '../transitions.ts';
import { turnResult } from './announcements.ts';

const initial = createGame('np1-4-1');
if (initial === null) throw new Error('Test board is invalid');

describe('turn announcements', () => {
  it('announces identical match and miss turns as separate results', () => {
    const one = activateCard(initial, 0);
    const match = activateCard(one, 11);
    expect(turnResult(one, match)).toBe('Pair found. 1 pair matched.');
    const nextOne = activateCard(match, 1);
    const miss = activateCard(nextOne, 2);
    expect(turnResult(nextOne, miss)).toBe('No match. Cards close after a short pause.');
  });

  it('announces a valid turn at the move cap and combines a final match with the win', () => {
    const pair = makeGameState(initial.board, [], { kind: SELECTION_KIND.one, index: 0 }, MAX_MOVES, 1_999, true);
    const match = activateCard(pair, 11);
    expect(match.moves).toBe(MAX_MOVES);
    expect(turnResult(pair, match)).toBe('Pair found. 1 pair matched.');
    const complete = makeGameState(initial.board, initial.board.deck.map((_, index) => index), { kind: SELECTION_KIND.closed }, 20, 3_600_000, true);
    const finalBefore = makeGameState(initial.board, complete.matched.slice(0, -2), { kind: SELECTION_KIND.one, index: 0 }, 19, 3_600_000, true);
    expect(turnResult(finalBefore, complete)).toBe('Pair found. All pairs found in 20 moves and 60:00.');
  });
});

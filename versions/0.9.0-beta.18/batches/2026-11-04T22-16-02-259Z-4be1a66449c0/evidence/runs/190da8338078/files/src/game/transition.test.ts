import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame, isWon, pairCount } from './transition.ts';
import { decodeSnapshot } from './snapshot.ts';

describe('turn transitions', () => {
  it('does not count a repeated first reveal and resolves a miss after active time', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('The test board was rejected.');
    const first = activateCard(initial, 0);
    expect(activateCard(first, 0)).toBe(first);
    const miss = activateCard(first, 1);
    expect(miss.moves).toBe(1);
    expect(activateCard(miss, 2)).toBe(miss);
    const almost = advanceGame(miss, 799);
    expect(almost.selection.kind).toBe('mismatch');
    expect(advanceGame(almost, 1).selection.kind).toBe('closed');
    expect(advanceGame(almost, 1).elapsedMs).toBe(800);
  });

  it('matches immediately and stops the clock after the final pair', () => {
    let game = createGame('np1-4-1');
    if (!game) throw new Error('The test board was rejected.');
    game = activateCard(game, 2);
    game = activateCard(game, 6);
    expect(pairCount(game)).toBe(1);
    for (let index = 0; index < game.board.deck.length; index += 1) {
      const deck = game.board.deck;
      const matched = game.matched;
      const face = deck[index];
      const partner = deck.findIndex((candidate, position) => candidate === face && position !== index && !matched.includes(position));
      if (!game.matched.includes(index) && partner >= 0) {
        game = activateCard(game, index);
        game = activateCard(game, partner);
      }
    }
    expect(isWon(game)).toBe(true);
    expect(advanceGame(game, 1000).elapsedMs).toBe(game.elapsedMs);
  });

  it('continues play when moves and elapsed time reach their caps', () => {
    const capped = decodeSnapshot(JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'one', index: 2 }, moves: 999_999, elapsedMs: 359_999_998, started: true }));
    if (!capped) throw new Error('The capped test snapshot was rejected.');
    const match = activateCard(capped, 6);
    expect(match.moves).toBe(999_999);
    expect(pairCount(match)).toBe(1);
    expect(advanceGame(capped, 100).elapsedMs).toBe(359_999_999);
  });
});

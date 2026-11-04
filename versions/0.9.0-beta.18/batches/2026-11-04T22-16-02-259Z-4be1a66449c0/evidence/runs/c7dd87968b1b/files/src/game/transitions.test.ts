import { describe, expect, it } from 'vitest';
import { createGame } from './createGame.ts';
import { activateCard, advanceGame, isWon, pairCount } from './transitions.ts';
import type { GameState } from './types.ts';

describe('card transitions and logical time', () => {
  it('ignores a repeated first card, then records one matching move', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid test deal');
    const first = activateCard(initial, 0);
    expect(activateCard(first, 0)).toBe(first);
    expect(first.moves).toBe(0);
    const matched = activateCard(first, 11);
    expect(matched.moves).toBe(1);
    expect(pairCount(matched)).toBe(1);
    expect(matched.matched).toEqual([0, 11]);
  });

  it('blocks activations through an 800ms miss and closes both together', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid test deal');
    const miss = activateCard(activateCard(initial, 0), 1);
    expect(miss.selection.kind).toBe('mismatch');
    expect(activateCard(miss, 2)).toBe(miss);
    expect(advanceGame(miss, 799).selection.kind).toBe('mismatch');
    const closed = advanceGame(miss, 800);
    expect(closed.selection.kind).toBe('closed');
    expect(closed.moves).toBe(1);
    expect(closed.elapsedMs).toBe(800);
  });

  it('starts the clock at the first reveal, caps it, and stops at a win', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid test deal');
    expect(advanceGame(initial, 5000).elapsedMs).toBe(0);
    const started = activateCard(initial, 0);
    const capped = advanceGame(started, 400_000_000);
    expect(capped.elapsedMs).toBe(359_999_999);
    const won = activateCard(started, 11);
    expect(isWon(won)).toBe(false);
    expect(advanceGame(won, 1000).elapsedMs).toBe(1000);
  });

  it('keeps the move count capped while allowing a match', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid test deal');
    const capped: GameState = { ...initial, selection: { kind: 'one', index: 0 }, started: true, moves: 999_999 };
    expect(activateCard(capped, 11).moves).toBe(999_999);
  });
});

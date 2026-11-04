import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame, isWon, matchedPairs } from './core.ts';

describe('card transitions and logical time', () => {
  it('ignores a repeated first card, matches immediately, and closes a miss at 800ms', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Fixture board should parse');
    const first = activateCard(start, 0);
    expect(activateCard(first, 0)).toBe(first);
    const match = activateCard(first, 11);
    expect(match.moves).toBe(1);
    expect(matchedPairs(match)).toBe(1);
    const miss = activateCard(activateCard(match, 1), 2);
    expect(miss.moves).toBe(2);
    expect(miss.selection).toMatchObject({ kind: 'mismatch', remainingMs: 800 });
    expect(activateCard(miss, 3)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
  });

  it('caps moves and time without stopping progress', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Fixture board should parse');
    const atMoveCap = { ...start, moves: 999999 };
    const one = activateCard(atMoveCap, 0);
    const miss = activateCard(activateCard(one, 1), 2);
    expect(miss.moves).toBe(999999);
    const atTimeCap = { ...one, elapsedMs: 359999998 };
    expect(advanceGame(atTimeCap, 20).elapsedMs).toBe(359999999);
  });

  it('reports a win only when every position is matched', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Fixture board should parse');
    expect(isWon(start)).toBe(false);
    const all = { ...start, matched: start.deck.map((_, index) => index) };
    expect(isWon(all)).toBe(true);
  });

  it('can finish every supported board using complete pairs', () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16] as const) {
      const start = createGame(`np1-${size}-1`);
      if (start === null) throw new Error('Fixture board should parse');
      let state = start;
      const positions = new Map<number, number[]>();
      start.deck.forEach((face, index) => positions.set(face, [...(positions.get(face) ?? []), index]));
      for (const pair of positions.values()) {
        const first = pair[0];
        const second = pair[1];
        if (first === undefined || second === undefined) throw new Error('Generated pair is incomplete');
        state = activateCard(activateCard(state, first), second);
      }
      expect(isWon(state)).toBe(true);
      expect(state.moves).toBe((size * size) / 2);
    }
  });
});

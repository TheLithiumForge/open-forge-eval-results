import { describe, expect, it } from 'vitest';
import { parseBoardCode, SIZES } from './boardCode.ts';
import { drawBounded, nextRandom } from './deck.ts';
import { createGame } from './state.ts';

const EXAMPLE_DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];

describe('version 1 board generation', () => {
  it('matches the published Park-Miller states', () => {
    let state = 1;
    const states: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      state = nextRandom(state);
      states.push(state);
    }
    expect(states).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });

  it('rejects the biased upper tail before returning a bounded draw', () => {
    // 739806647 is the modular inverse seed whose first draw is 2147483646.
    expect(drawBounded(739806647, 100)).toEqual({ state: 2147466840, value: 39 });
  });

  it('matches independent literal deal vectors', () => {
    expect(createGame('np1-4-1')?.deck).toEqual(EXAMPLE_DECK);
    // This second literal was calculated independently with Python integer arithmetic.
    expect(createGame('np1-4-2147483646')?.deck).toEqual(
      [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3],
    );
  });

  it.each(SIZES)('deals exactly two of every face on a side-%i board', (size) => {
    const game = createGame(`np1-${size}-17`);
    expect(game).not.toBeNull();
    const deck = game?.deck ?? [];
    expect(deck).toHaveLength(size * size);
    const counts = new Map<number, number>();
    for (const face of deck) counts.set(face, (counts.get(face) ?? 0) + 1);
    expect(counts.size).toBe(size * size / 2);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
    expect(Object.isFrozen(game?.board)).toBe(true);
    expect(Object.isFrozen(deck)).toBe(true);
  });

  it.each(['np1-4-0', 'np1-4-01', 'np1-04-1', 'np1-5-1', 'np2-4-1',
    'np1-4-2147483647', 'np1-4-1.0', 'np1-4-+1', 'np1-4-1\n', ' np1-4-1',
    'np1-4-1 ', 'np1-4-9007199254740993', 'np1-4-1e2'])('rejects %j', (code) => {
    expect(parseBoardCode(code)).toBeNull();
    expect(createGame(code)).toBeNull();
  });
});

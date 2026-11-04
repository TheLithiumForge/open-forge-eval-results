import { describe, expect, it } from 'vitest';
import { createGame, parseBoardCode } from './deal.ts';
import { sizes } from './model.ts';

describe('version 1 deals', () => {
  it('matches the independent published literal vector', () => {
    expect(createGame('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('matches independent integer-arithmetic vectors, including a rejected first draw', () => {
    // Python modular arithmetic: seed 739806647 draws 2147483646 first,
    // outside the first shuffle draw's acceptance interval (bound 16).
    const expected = [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3];
    expect(createGame('np1-4-2147483646')?.deck).toEqual(expected);
    expect(createGame('np1-4-739806647')?.deck).toEqual(expected);
  });
  it.each(sizes)('generates exactly two of every face on a %i board', size => {
    const game = createGame(`np1-${size}-2147483646`);
    expect(game?.deck).toHaveLength(size ** 2);
    for (let id = 0; id < size ** 2 / 2; id++) expect(game?.deck.filter(face => face === id)).toHaveLength(2);
    expect(Object.isFrozen(game?.deck)).toBe(true);
    expect(Object.isFrozen(game?.board)).toBe(true);
    expect(game).toEqual(createGame(`np1-${size}-2147483646`));
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np1-5-1',
    'NP1-4-1', ' np1-4-1', 'np1-4-1\n', 'np2-4-1', 'np1-4-1.0', 'np1-4-1e1', 'np1-4-99999999999999999'])
  ('rejects noncanonical board code %s', code => expect(parseBoardCode(code)).toBeNull());
});

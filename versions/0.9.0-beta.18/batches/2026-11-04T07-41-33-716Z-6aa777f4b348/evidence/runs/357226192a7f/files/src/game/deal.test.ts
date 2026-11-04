import { describe, expect, it } from 'vitest';
import { generateDeck, parseBoardCode, SIZES } from './deal.ts';

function deck(code: string) {
  const board = parseBoardCode(code);
  if (!board) throw new Error('Invalid test board');
  return generateDeck(board);
}

describe('version 1 generation: independent literal vectors', () => {
  it('matches the published seed 1 deal', () => {
    expect(deck('np1-4-1')).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('matches a separately calculated six-column deal', () => {
    expect(deck('np1-6-42')).toEqual([10, 14, 7, 2, 13, 14, 17, 0, 8, 16, 13, 7, 5, 10,
      11, 3, 15, 3, 9, 12, 9, 1, 4, 16, 8, 12, 1, 6, 15, 5, 17, 4, 0, 6, 11, 2]);
  });
  it('rejects an out-of-limit generator draw before shuffling', () => {
    // 739806647 * 16807 mod 2147483647 = 2147483646: rejected for bound 16.
    expect(deck('np1-4-739806647')).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });
  it.each(SIZES)('has immutable whole pairs at size %i', size => {
    const cards = deck('np1-' + size + '-2147483646');
    expect(cards).toHaveLength(size ** 2);
    expect(Object.isFrozen(cards)).toBe(true);
    expect(new Set(cards).size).toBe(size ** 2 / 2);
    for (const face of new Set(cards)) expect(cards.filter(value => value === face)).toHaveLength(2);
  });
  it.each([' np1-4-1', 'np1-4-1 ', 'np1-4-01', 'np1-04-1', 'np2-4-1', 'np1-5-1',
    'np1-4-0', 'np1-4-2147483647', 'np1-4-1.0', 'np1-4-+1', 'np1-4-1\n', 'np1-4-1e2'])('rejects %j', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
});

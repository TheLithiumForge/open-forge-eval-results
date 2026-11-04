import { describe, expect, it } from 'vitest';
import { generateBoard, nextRandom, parseBoardCode, SIZES } from './boardCode.ts';

const vector = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
describe('version 1 deals', () => {
  it('matches the independent specification vectors', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => { state = nextRandom(state); return state; }))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
    expect(generateBoard('np1-4-1')?.deck).toEqual(vector);
  });
  it.each(SIZES)('makes complete, immutable pairs at side %i', size => {
    const board = generateBoard(`np1-${size}-2147483646`);
    expect(board?.deck).toHaveLength(size * size);
    expect(new Set(board?.deck).size).toBe(size * size / 2);
    for (const face of new Set(board?.deck)) expect(board?.deck.filter(value => value === face)).toHaveLength(2);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board?.deck)).toBe(true);
  });
  it.each(['np1-4-0', 'np1-4-01', 'np1-04-1', 'np2-4-1', 'np1-5-1', 'np1-4-2147483647',
    'np1-4-1\n', ' np1-4-1', 'np1-4-1.0', 'np1-4-1e2', 'np1-4-+1', 'np1-4-999999999999999999'])
  ('rejects noncanonical code %j', code => expect(parseBoardCode(code)).toBeNull());
});

import { describe, expect, it } from 'vitest';
import { parseBoardCode, SIZES } from './boardCode.ts';
import { nextParkMiller } from './deck.ts';
import { createGame } from './state.ts';

describe('version 1 board codes and independent literal vectors', () => {
  it('has the documented Park–Miller states', () => {
    let state = 1;
    const states = Array.from({ length: 5 }, () => (state = nextParkMiller(state)));
    expect(states).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it('has the documented deal and independently calculated boundary vectors', () => {
    expect(createGame('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(createGame('np1-4-2147483646')?.deck).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    expect(createGame('np1-6-42')?.deck).toEqual([
      10, 14, 7, 2, 13, 14, 17, 0, 8, 16, 13, 7, 5, 10, 11, 3, 15, 3,
      9, 12, 9, 1, 4, 16, 8, 12, 1, 6, 15, 5, 17, 4, 0, 6, 11, 2,
    ]);
  });
  it('rejects a biased draw before shuffling (independent Python integer vector)', () => {
    const deck = createGame('np1-16-739806647')?.deck;
    expect(deck?.slice(0, 16)).toEqual([17, 52, 6, 47, 5, 105, 22, 12, 65, 106, 27, 46, 32, 81, 110, 50]);
    expect(deck?.slice(-16)).toEqual([16, 23, 41, 55, 65, 48, 39, 25, 63, 51, 7, 88, 90, 115, 53, 43]);
  });
  it.each(['np2-4-1', 'np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647',
    'np1-5-1', 'np1-4-1\n', ' np1-4-1', 'np1-4-1x', 'np1-4-1.0', 'np1-4-+1'])('rejects %j', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
  it.each(SIZES)('contains exactly two of each face for size %i', size => {
    const game = createGame(`np1-${size}-1`);
    expect(game?.deck).toHaveLength(size ** 2);
    for (let id = 0; id < size ** 2 / 2; id++) expect(game?.deck.filter(face => face === id)).toHaveLength(2);
    expect(Object.isFrozen(game?.deck)).toBe(true);
    expect(Object.isFrozen(game?.board)).toBe(true);
  });
});

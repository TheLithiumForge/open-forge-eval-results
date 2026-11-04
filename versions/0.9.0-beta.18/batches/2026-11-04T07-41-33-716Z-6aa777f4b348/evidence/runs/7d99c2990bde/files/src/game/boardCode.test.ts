import { describe, expect, it } from 'vitest';
import { boardSizes, parseBoardCode } from './boardCode.ts';
import { generateDeck, nextGeneratorState } from './deck.ts';

describe('version 1 board generation', () => {
  it('matches independent literal Park-Miller states', () => {
    let state = 1;
    const observed: number[] = [];
    for (let i = 0; i < 5; i++) { state = nextGeneratorState(state); observed.push(state); }
    expect(observed).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });

  it('matches the specified literal shuffle', () => {
    const board = parseBoardCode('np1-4-1');
    if (!board) throw new Error('Expected valid board');
    expect(generateDeck(board)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(generateDeck(board))).toBe(true);
  });

  it.each(boardSizes)('contains exactly two of each face at size %i', size => {
    const board = parseBoardCode(`np1-${size}-2147483646`);
    if (!board) throw new Error('Expected valid board');
    const deck = generateDeck(board);
    expect(deck).toHaveLength(size * size);
    for (let id = 0; id < deck.length / 2; id++) expect(deck.filter(face => face === id)).toHaveLength(2);
    expect(generateDeck(board)).toEqual(deck);
  });

  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4--1', 'np1-4-2147483647',
    'np1-4-1.0', 'np1-5-1', 'np2-4-1', ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n',
    'np1-4-9007199254740993', 'np1-4-1e2', 'NP1-4-1'])('rejects noncanonical code %j', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
});

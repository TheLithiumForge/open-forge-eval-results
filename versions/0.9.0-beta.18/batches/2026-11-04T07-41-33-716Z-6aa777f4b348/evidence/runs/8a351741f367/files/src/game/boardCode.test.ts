import { describe, expect, it } from 'vitest';
import { parseBoardCode, SIZES } from './boardCode.ts';
import { drawBelow, generateDeck, nextRandomState } from './deck.ts';

describe('version 1 board generation', () => {
  it('matches the five independent Park-Miller states in D03', () => {
    let state = 1;
    const states = Array.from({ length: 5 }, () => { state = nextRandomState(state); return state; });
    expect(states).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });

  it.each([
    ['np1-4-1', [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]],
    ['np1-4-42', [4, 2, 1, 7, 6, 3, 1, 7, 5, 0, 3, 0, 4, 5, 6, 2]],
    ['np1-4-2147483646', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
  ])('matches literal independently calculated deck %s', (code, vector) => {
    const board = parseBoardCode(code);
    if (!board) throw new Error('Invalid literal fixture.');
    expect(generateDeck(board)).toEqual(vector);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(generateDeck(board))).toBe(true);
  });

  it('rejects generator results above the uniform sampling limit', () => {
    // This state first produces 2147483646, rejected for a 256-result draw.
    expect(drawBelow(739806647, 256)).toEqual([2147466840, 87]);
  });

  it.each(SIZES)('contains exactly two of every face on %ix%i boards', (size) => {
    const board = parseBoardCode(`np1-${size}-1`);
    if (!board) throw new Error('Invalid fixture.');
    const deck = generateDeck(board);
    expect(deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(deck.filter((value) => value === face)).toHaveLength(2);
    }
  });

  it.each(['', 'np2-4-1', 'np1-5-1', 'np1-04-1', 'np1-4-01', 'np1-4-0',
    'np1-4--1', 'np1-4-2147483647', 'np1-4-1.0', 'np1-4-1e1',
    ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-1\r\n'])('rejects noncanonical code %j', (code) => {
    expect(parseBoardCode(code)).toBeNull();
  });
});

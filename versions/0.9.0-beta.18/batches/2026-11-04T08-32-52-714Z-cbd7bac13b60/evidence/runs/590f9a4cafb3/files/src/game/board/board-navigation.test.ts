import assert from 'node:assert/strict';
import { test } from 'vitest';
import { GRID_SIZES } from '../deck.ts';
import { nextCard } from './board-navigation.ts';

test('arrows reach the neighboring card in the same row or column', () => {
  for (const [key, destination] of [
    ['ArrowLeft', 4],
    ['ArrowRight', 6],
    ['ArrowUp', 1],
    ['ArrowDown', 9],
  ] as const)
    assert.equal(nextCard(5, 4, key), destination);
});

test('arrows stop at every row and column edge on every supported size', () => {
  for (const size of GRID_SIZES)
    for (let position = 0; position < size; position += 1) {
      const rowStart = position * size;
      const rowEnd = rowStart + size - 1;
      const columnEnd = size * (size - 1) + position;
      assert.equal(nextCard(rowStart, size, 'ArrowLeft'), rowStart);
      assert.equal(nextCard(rowEnd, size, 'ArrowRight'), rowEnd);
      assert.equal(nextCard(position, size, 'ArrowUp'), position);
      assert.equal(nextCard(columnEnd, size, 'ArrowDown'), columnEnd);
    }
});

test('vertical movement uses the current board size', () => {
  for (const size of GRID_SIZES) {
    assert.equal(nextCard(1, size, 'ArrowDown'), size + 1);
    assert.equal(nextCard(size + 1, size, 'ArrowUp'), 1);
  }
});

test('other keys have no navigation destination', () => {
  for (const key of ['Enter', ' ', 'Tab', 'Home', 'End', 'PageUp', 'PageDown', 'a', 'h'])
    assert.equal(nextCard(5, 4, key), null);
});

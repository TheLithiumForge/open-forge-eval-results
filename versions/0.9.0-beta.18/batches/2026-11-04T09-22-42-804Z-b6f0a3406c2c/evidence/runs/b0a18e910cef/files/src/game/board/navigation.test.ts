import assert from 'node:assert/strict';
import { test } from 'vitest';
import { cardInDirection } from './navigation.ts';

test('each arrow moves one card in its row or column', () => {
  assert.equal(cardInDirection(5, 4, 'ArrowLeft'), 4);
  assert.equal(cardInDirection(5, 4, 'ArrowRight'), 6);
  assert.equal(cardInDirection(5, 4, 'ArrowUp'), 1);
  assert.equal(cardInDirection(5, 4, 'ArrowDown'), 9);
});

test('every row and column stops at its edges for every supported size', () => {
  for (const size of [4, 6, 8, 10, 12, 14, 16]) {
    for (let row = 0; row < size; row += 1) {
      const first = row * size;
      const last = first + size - 1;
      assert.equal(cardInDirection(first, size, 'ArrowLeft'), first);
      assert.equal(cardInDirection(last, size, 'ArrowRight'), last);
      assert.equal(cardInDirection(first, size, 'ArrowRight'), first + 1);
      assert.equal(cardInDirection(last, size, 'ArrowLeft'), last - 1);
    }
    for (let column = 0; column < size; column += 1) {
      const last = size * (size - 1) + column;
      assert.equal(cardInDirection(column, size, 'ArrowUp'), column);
      assert.equal(cardInDirection(last, size, 'ArrowDown'), last);
      assert.equal(cardInDirection(column, size, 'ArrowDown'), column + size);
      assert.equal(cardInDirection(last, size, 'ArrowUp'), last - size);
    }
  }
});

test('other keys have no board movement destination', () => {
  for (const key of ['Tab', 'Enter', ' ', 'Home', 'End', 'PageUp', 'PageDown', 'a'])
    assert.equal(cardInDirection(5, 4, key), null);
});

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { keyboardDestination } from './keyboard-navigation.ts';

test('arrow keys move one card in the same row or column', () => {
  assert.equal(keyboardDestination(5, 4, 'ArrowLeft'), 4);
  assert.equal(keyboardDestination(5, 4, 'ArrowRight'), 6);
  assert.equal(keyboardDestination(5, 4, 'ArrowUp'), 1);
  assert.equal(keyboardDestination(5, 4, 'ArrowDown'), 9);
  assert.equal(keyboardDestination(136, 16, 'ArrowLeft'), 135);
  assert.equal(keyboardDestination(136, 16, 'ArrowRight'), 137);
  assert.equal(keyboardDestination(136, 16, 'ArrowUp'), 120);
  assert.equal(keyboardDestination(136, 16, 'ArrowDown'), 152);
});

test('arrows stop at every board edge without wrapping rows', () => {
  for (const size of [4, 6, 8, 10, 12, 14, 16]) {
    for (let offset = 0; offset < size; offset += 1) {
      const left = offset * size;
      const right = left + size - 1;
      const bottom = size * (size - 1) + offset;
      assert.equal(keyboardDestination(left, size, 'ArrowLeft'), left);
      assert.equal(keyboardDestination(right, size, 'ArrowRight'), right);
      assert.equal(keyboardDestination(offset, size, 'ArrowUp'), offset);
      assert.equal(keyboardDestination(bottom, size, 'ArrowDown'), bottom);
    }
  }
});

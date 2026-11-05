import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isBoardArrowKey, nextCardIndex } from './keyboard-movement.ts';

test('recognizes only the four board movement keys', () => {
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
    assert.equal(isBoardArrowKey(key), true);
  for (const key of ['Enter', ' ', 'Tab', 'ArrowLeft ']) assert.equal(isBoardArrowKey(key), false);
});

test('moves one card along the requested row or column', () => {
  assert.deepEqual(
    [
      nextCardIndex(5, 'ArrowLeft', 4),
      nextCardIndex(5, 'ArrowRight', 4),
      nextCardIndex(5, 'ArrowUp', 4),
      nextCardIndex(5, 'ArrowDown', 4),
    ],
    [4, 6, 1, 9],
  );
});

test('keeps focus at each corresponding board edge', () => {
  assert.deepEqual(
    [
      nextCardIndex(4, 'ArrowLeft', 4),
      nextCardIndex(7, 'ArrowRight', 4),
      nextCardIndex(2, 'ArrowUp', 4),
      nextCardIndex(14, 'ArrowDown', 4),
    ],
    [4, 7, 2, 14],
  );
});

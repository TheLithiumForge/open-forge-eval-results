import assert from 'node:assert/strict';
import { test } from 'vitest';
import { arrowDestination } from './keyboard-navigation.ts';

test('arrows move by one column or row without wrapping at each edge', () => {
  for (const [index, key, destination] of [
    [5, 'ArrowLeft', 4],
    [5, 'ArrowRight', 6],
    [5, 'ArrowUp', 1],
    [5, 'ArrowDown', 9],
    [4, 'ArrowLeft', 4],
    [7, 'ArrowRight', 7],
    [2, 'ArrowUp', 2],
    [14, 'ArrowDown', 14],
    [0, 'ArrowLeft', 0],
    [0, 'ArrowUp', 0],
    [15, 'ArrowRight', 15],
    [15, 'ArrowDown', 15],
  ] as const)
    assert.equal(arrowDestination(index, 4, key), destination);
});

test('large board navigation uses the current row width', () => {
  assert.equal(arrowDestination(239, 16, 'ArrowDown'), 255);
  assert.equal(arrowDestination(255, 16, 'ArrowRight'), 255);
  assert.equal(arrowDestination(255, 16, 'ArrowDown'), 255);
  assert.equal(arrowDestination(255, 16, 'ArrowUp'), 239);
  assert.equal(arrowDestination(240, 16, 'ArrowLeft'), 240);
});

test('keys outside the four arrows have no navigation destination', () => {
  for (const key of ['Tab', 'Enter', ' ', 'Home', 'End', 'PageUp', 'PageDown', 'a'])
    assert.equal(arrowDestination(5, 4, key), null);
});

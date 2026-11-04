import assert from 'node:assert/strict';
import { test } from 'vitest';
import { arrowTarget } from './arrow-move.ts';

test('arrows move within the row and column', () => {
  assert.equal(arrowTarget('ArrowRight', 5, 4), 6);
  assert.equal(arrowTarget('ArrowLeft', 5, 4), 4);
  assert.equal(arrowTarget('ArrowDown', 5, 4), 9);
  assert.equal(arrowTarget('ArrowUp', 5, 4), 1);
});

test('arrows stop at every board edge', () => {
  assert.equal(arrowTarget('ArrowLeft', 4, 4), 4, 'left edge does not wrap to the previous row');
  assert.equal(arrowTarget('ArrowRight', 7, 4), 7, 'right edge does not wrap to the next row');
  assert.equal(arrowTarget('ArrowUp', 2, 4), 2);
  assert.equal(arrowTarget('ArrowDown', 14, 4), 14);
});

test('other keys are left to the browser', () => {
  for (const key of ['Enter', ' ', 'Tab', 'Home', 'a']) assert.equal(arrowTarget(key, 5, 4), null);
});

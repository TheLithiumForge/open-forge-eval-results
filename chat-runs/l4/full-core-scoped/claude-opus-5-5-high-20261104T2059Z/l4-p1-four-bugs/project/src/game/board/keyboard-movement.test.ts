import assert from 'node:assert/strict';
import { test } from 'vitest';
import { arrowTarget } from './keyboard-movement.ts';

test('arrow keys move one card within the row or column', () => {
  assert.equal(arrowTarget('ArrowRight', 5, 4), 6);
  assert.equal(arrowTarget('ArrowLeft', 5, 4), 4);
  assert.equal(arrowTarget('ArrowDown', 5, 4), 9);
  assert.equal(arrowTarget('ArrowUp', 5, 4), 1);
});

test('arrow movement stops at every board edge', () => {
  assert.equal(arrowTarget('ArrowLeft', 4, 4), 4);
  assert.equal(arrowTarget('ArrowRight', 7, 4), 7);
  assert.equal(arrowTarget('ArrowUp', 2, 4), 2);
  assert.equal(arrowTarget('ArrowDown', 255, 16), 255);
});

test('other keys are left to the browser', () => {
  for (const key of ['Enter', ' ', 'Tab', 'Home', 'a', 'constructor'])
    assert.equal(arrowTarget(key, 5, 4), null);
});

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { arrowDestination } from './board-keys.ts';

const PLAIN = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

function press(key: string, index: number, size = 4) {
  return arrowDestination({ ...PLAIN, key }, index, size);
}

test('arrow keys move one card along the row or column', () => {
  assert.equal(press('ArrowRight', 5), 6);
  assert.equal(press('ArrowLeft', 5), 4);
  assert.equal(press('ArrowDown', 5), 9);
  assert.equal(press('ArrowUp', 5), 1);
  assert.equal(press('ArrowDown', 17, 16), 33);
});

test('arrow keys stop at every board edge on the same card', () => {
  assert.equal(press('ArrowLeft', 4), 4);
  assert.equal(press('ArrowRight', 3), 3);
  assert.equal(press('ArrowUp', 2), 2);
  assert.equal(press('ArrowDown', 13), 13);
  assert.equal(press('ArrowRight', 255, 16), 255);
});

test('other keys and modified arrows stay with the browser', () => {
  for (const key of ['Enter', ' ', 'Tab', 'Home', 'a']) assert.equal(press(key, 5), null);
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
    assert.equal(arrowDestination({ ...PLAIN, [modifier]: true, key: 'ArrowRight' }, 5, 4), null);
});

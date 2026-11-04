import assert from 'node:assert/strict';
import { test } from 'vitest';
import { movedCard } from './board-keys.ts';

const PLAIN = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

function press(index: number, key: string, modifiers = {}) {
  return movedCard(index, 4, { ...PLAIN, ...modifiers, key });
}

test('arrow keys move one card along the row or column', () => {
  assert.equal(press(5, 'ArrowLeft'), 4);
  assert.equal(press(5, 'ArrowRight'), 6);
  assert.equal(press(5, 'ArrowUp'), 1);
  assert.equal(press(5, 'ArrowDown'), 9);
});

test('arrow movement stops at every board edge', () => {
  assert.equal(press(0, 'ArrowLeft'), 0);
  assert.equal(press(0, 'ArrowUp'), 0);
  assert.equal(press(3, 'ArrowRight'), 3);
  assert.equal(press(4, 'ArrowLeft'), 4, 'a row start never wraps to the previous row');
  assert.equal(press(7, 'ArrowRight'), 7, 'a row end never wraps to the next row');
  assert.equal(press(15, 'ArrowDown'), 15);
});

test('other keys and modified arrows stay with the browser', () => {
  for (const key of ['Tab', 'Home', 'End', 'PageDown', 'Enter', ' ', 'a'])
    assert.equal(press(5, key), null, key);
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
    assert.equal(press(5, 'ArrowRight', { [modifier]: true }), null, modifier);
});

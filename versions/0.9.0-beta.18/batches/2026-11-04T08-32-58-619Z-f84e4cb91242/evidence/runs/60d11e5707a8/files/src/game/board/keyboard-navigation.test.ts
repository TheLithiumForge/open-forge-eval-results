import assert from 'node:assert/strict';
import { test } from 'vitest';
import { arrowDestination } from './keyboard-navigation.ts';

test('arrows move one card in the same row or column', () => {
  assert.equal(arrowDestination(5, 4, 'ArrowLeft'), 4);
  assert.equal(arrowDestination(5, 4, 'ArrowRight'), 6);
  assert.equal(arrowDestination(5, 4, 'ArrowUp'), 1);
  assert.equal(arrowDestination(5, 4, 'ArrowDown'), 9);
});

test('arrows stop at each edge without wrapping between rows', () => {
  assert.equal(arrowDestination(4, 4, 'ArrowLeft'), 4);
  assert.equal(arrowDestination(7, 4, 'ArrowRight'), 7);
  assert.equal(arrowDestination(2, 4, 'ArrowUp'), 2);
  assert.equal(arrowDestination(14, 4, 'ArrowDown'), 14);
});

test('the largest board keeps its full row and column range', () => {
  assert.equal(arrowDestination(239, 16, 'ArrowDown'), 255);
  assert.equal(arrowDestination(255, 16, 'ArrowDown'), 255);
  assert.equal(arrowDestination(255, 16, 'ArrowRight'), 255);
  assert.equal(arrowDestination(240, 16, 'ArrowLeft'), 240);
  assert.equal(arrowDestination(15, 16, 'ArrowUp'), 15);
});

test('Tab and activation keys keep their native behavior', () => {
  for (const key of ['Tab', 'Enter', ' ']) assert.equal(arrowDestination(5, 4, key), null);
});

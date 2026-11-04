import { expect, it } from 'vitest';
import { focusDestination } from './navigation.ts';

it.each([
  [0, 'ArrowLeft', 0], [3, 'ArrowRight', 3], [1, 'ArrowUp', 1], [13, 'ArrowDown', 13],
  [5, 'ArrowLeft', 4], [5, 'ArrowRight', 6], [5, 'ArrowUp', 1], [5, 'ArrowDown', 9],
  [5, 'Home', null], [5, 'Tab', null], [5, 'Enter', null],
] as const)('moves from %s with %s to %s without crossing row edges', (index, key, result) => {
  expect(focusDestination(index, 4, key)).toBe(result);
});

it('reaches the far corner of the largest supported board', () => {
  expect(focusDestination(239, 16, 'ArrowDown')).toBe(255);
  expect(focusDestination(255, 16, 'ArrowRight')).toBe(255);
});

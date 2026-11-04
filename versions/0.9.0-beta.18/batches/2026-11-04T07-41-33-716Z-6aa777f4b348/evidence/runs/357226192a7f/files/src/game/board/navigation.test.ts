import { expect, it } from 'vitest';
import { focusDestination } from './navigation.ts';

it('moves within rows and columns without wrapping', () => {
  expect(focusDestination('ArrowLeft', 0, 4)).toBe(0);
  expect(focusDestination('ArrowRight', 3, 4)).toBe(3);
  expect(focusDestination('ArrowUp', 2, 4)).toBe(2);
  expect(focusDestination('ArrowDown', 15, 4)).toBe(15);
  expect(focusDestination('ArrowRight', 4, 4)).toBe(5);
  expect(focusDestination('ArrowDown', 4, 4)).toBe(8);
  expect(focusDestination('ArrowLeft', 5, 4)).toBe(4);
  expect(focusDestination('ArrowUp', 8, 4)).toBe(4);
  expect(focusDestination('Home', 5, 4)).toBeNull();
});

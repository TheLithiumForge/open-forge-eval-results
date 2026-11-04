import { expect, it } from 'vitest';
import { focusDestination } from './navigation.ts';

it('moves in row order without wrapping at each edge', () => {
  expect(focusDestination(0, 4, 'ArrowLeft')).toBe(0);
  expect(focusDestination(0, 4, 'ArrowUp')).toBe(0);
  expect(focusDestination(3, 4, 'ArrowRight')).toBe(3);
  expect(focusDestination(15, 4, 'ArrowDown')).toBe(15);
  expect(focusDestination(5, 4, 'ArrowLeft')).toBe(4);
  expect(focusDestination(5, 4, 'ArrowRight')).toBe(6);
  expect(focusDestination(5, 4, 'ArrowUp')).toBe(1);
  expect(focusDestination(5, 4, 'ArrowDown')).toBe(9);
  expect(focusDestination(0, 4, 'Tab')).toBeNull();
});

import { expect, it } from 'vitest';
import { SUPPORTED_SIZES } from '../board-code.ts';
import { focusDestination, isMovementKey, MOVEMENT_KEYS } from './navigation.ts';

it('stops at each edge instead of wrapping into another row or column', () => {
  expect(focusDestination(0, 4, 'ArrowLeft')).toBe(0);
  expect(focusDestination(0, 4, 'ArrowUp')).toBe(0);
  expect(focusDestination(3, 4, 'ArrowRight')).toBe(3);
  expect(focusDestination(15, 4, 'ArrowDown')).toBe(15);
  expect(focusDestination(7, 4, 'ArrowLeft')).toBe(6);
  expect(focusDestination(7, 4, 'ArrowRight')).toBe(7);
  expect(focusDestination(7, 4, 'ArrowUp')).toBe(3);
  expect(focusDestination(7, 4, 'ArrowDown')).toBe(11);
});

it('moves at most one adjacent position and stays in bounds at every board size', () => {
  for (const size of SUPPORTED_SIZES) {
    for (let index = 0; index < size * size; index += 1) {
      for (const key of MOVEMENT_KEYS) {
        const destination = focusDestination(index, size, key);
        expect(destination).toBeGreaterThanOrEqual(0);
        expect(destination).toBeLessThan(size * size);
        const dx = Math.abs(destination % size - index % size);
        const dy = Math.abs(Math.floor(destination / size) - Math.floor(index / size));
        expect(dx + dy).toBeLessThanOrEqual(1);
        if (key === 'ArrowLeft' || key === 'ArrowRight') expect(dy).toBe(0);
        else expect(dx).toBe(0);
      }
    }
  }
});

it('recognizes only the four documented movement keys', () => {
  for (const key of ['Tab', 'Home', 'End', 'Enter', ' ', 'a', 'Left']) expect(isMovementKey(key)).toBe(false);
  for (const key of MOVEMENT_KEYS) expect(isMovementKey(key)).toBe(true);
});

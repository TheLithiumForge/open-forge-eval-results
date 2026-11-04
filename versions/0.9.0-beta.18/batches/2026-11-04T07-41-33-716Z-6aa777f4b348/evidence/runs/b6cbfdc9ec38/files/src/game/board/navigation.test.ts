import { describe, expect, it } from 'vitest';
import { SIDES } from '../boardCode.ts';
import { focusDestination, isMovementKey } from './navigation.ts';

describe('board keyboard movement', () => {
  it.each(SIDES)('moves one row or column at size %i without wrapping', (size) => {
    expect(focusDestination(0, size, 'ArrowLeft')).toBe(0);
    expect(focusDestination(0, size, 'ArrowUp')).toBe(0);
    expect(focusDestination(size - 1, size, 'ArrowRight')).toBe(size - 1);
    expect(focusDestination(size * size - 1, size, 'ArrowDown')).toBe(size * size - 1);
    expect(focusDestination(size, size, 'ArrowLeft')).toBe(size);
    expect(focusDestination(size + 1, size, 'ArrowLeft')).toBe(size);
    expect(focusDestination(size + 1, size, 'ArrowRight')).toBe(size + 2);
    expect(focusDestination(size + 1, size, 'ArrowUp')).toBe(1);
    expect(focusDestination(size + 1, size, 'ArrowDown')).toBe(size * 2 + 1);
  });

  it('recognizes only the four supported movement keys', () => {
    for (const key of ['Home', 'End', 'PageDown', 'Tab', 'Enter', ' ', 'a']) {
      expect(isMovementKey(key)).toBe(false);
    }
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      expect(isMovementKey(key)).toBe(true);
    }
  });
});

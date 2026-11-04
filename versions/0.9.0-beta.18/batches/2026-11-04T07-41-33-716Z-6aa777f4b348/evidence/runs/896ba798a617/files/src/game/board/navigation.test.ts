import { describe, expect, it } from 'vitest';
import { moveFocus } from './navigation.ts';

describe('board arrow movement', () => {
  it.each([
    [0, 'ArrowLeft', 0], [0, 'ArrowUp', 0], [3, 'ArrowRight', 3], [12, 'ArrowDown', 12],
    [5, 'ArrowLeft', 4], [5, 'ArrowRight', 6], [5, 'ArrowUp', 1], [5, 'ArrowDown', 9],
  ])('moves from %i with %s to %i without wrapping', (index, key, destination) => {
    expect(moveFocus(Number(index), 4, String(key))).toBe(destination);
  });
  it.each(['Tab', 'Home', 'End', 'a', 'PageDown', 'Escape'])('leaves %s to the browser', (key) => {
    expect(moveFocus(5, 4, key)).toBeNull();
  });
  it('reaches the final row and column on a sixteen-column board', () => {
    expect(moveFocus(239, 16, 'ArrowDown')).toBe(255);
    expect(moveFocus(255, 16, 'ArrowRight')).toBe(255);
    expect(moveFocus(255, 16, 'ArrowDown')).toBe(255);
  });
});

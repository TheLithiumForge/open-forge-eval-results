import { describe, expect, it } from 'vitest';
import { focusDestination } from './navigation.ts';

describe('board focus movement', () => {
  it('moves within rows and columns without wrapping edges', () => {
    expect(focusDestination(5, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(5, 4, 'ArrowRight')).toBe(6);
    expect(focusDestination(5, 4, 'ArrowUp')).toBe(1);
    expect(focusDestination(5, 4, 'ArrowDown')).toBe(9);
    expect(focusDestination(0, 4, 'ArrowLeft')).toBe(0);
    expect(focusDestination(3, 4, 'ArrowRight')).toBe(3);
    expect(focusDestination(0, 4, 'ArrowUp')).toBe(0);
    expect(focusDestination(255, 16, 'ArrowDown')).toBe(255);
    for (const key of ['Tab', 'Home', 'End', 'PageDown', 'a']) expect(focusDestination(0, 4, key)).toBeNull();
  });
});

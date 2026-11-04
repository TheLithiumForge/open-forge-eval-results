import { describe, expect, it } from 'vitest';
import { focusDestination } from './navigation.ts';

describe('board focus movement', () => {
  it('moves through row and column neighbors without row wrapping', () => {
    expect(focusDestination(5, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(5, 4, 'ArrowRight')).toBe(6);
    expect(focusDestination(5, 4, 'ArrowUp')).toBe(1);
    expect(focusDestination(5, 4, 'ArrowDown')).toBe(9);
    expect(focusDestination(4, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(7, 4, 'ArrowRight')).toBe(7);
    expect(focusDestination(2, 4, 'ArrowUp')).toBe(2);
    expect(focusDestination(14, 4, 'ArrowDown')).toBe(14);
  });

  it('stops at all 16x16 boundaries and leaves other keys to the browser', () => {
    expect(focusDestination(0, 16, 'ArrowLeft')).toBe(0);
    expect(focusDestination(0, 16, 'ArrowUp')).toBe(0);
    expect(focusDestination(255, 16, 'ArrowRight')).toBe(255);
    expect(focusDestination(255, 16, 'ArrowDown')).toBe(255);
    for (const key of ['Tab', 'Home', 'End', 'Enter', ' ', 'a']) expect(focusDestination(5, 4, key)).toBeNull();
  });
});

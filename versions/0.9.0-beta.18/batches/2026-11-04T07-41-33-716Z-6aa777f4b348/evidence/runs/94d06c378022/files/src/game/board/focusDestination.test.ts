import { describe, expect, it } from 'vitest';
import { focusDestination } from './focusDestination.ts';

describe('board arrow navigation', () => {
  it('moves within rows and columns without wrapping at edges', () => {
    expect(focusDestination(0, 4, 'ArrowLeft')).toBe(0);
    expect(focusDestination(3, 4, 'ArrowRight')).toBe(3);
    expect(focusDestination(4, 4, 'ArrowUp')).toBe(0);
    expect(focusDestination(12, 4, 'ArrowDown')).toBe(12);
    expect(focusDestination(5, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(5, 4, 'ArrowRight')).toBe(6);
    expect(focusDestination(5, 4, 'ArrowUp')).toBe(1);
    expect(focusDestination(5, 4, 'ArrowDown')).toBe(9);
  });
});

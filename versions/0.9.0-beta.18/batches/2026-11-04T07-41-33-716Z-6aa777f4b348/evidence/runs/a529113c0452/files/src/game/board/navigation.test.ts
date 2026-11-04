import { describe, expect, it } from 'vitest';
import { focusDestination } from './navigation.ts';

describe('board arrow movement', () => {
  it('moves within rows and columns without wrapping', () => {
    expect(focusDestination(5, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(5, 4, 'ArrowRight')).toBe(6);
    expect(focusDestination(5, 4, 'ArrowUp')).toBe(1);
    expect(focusDestination(5, 4, 'ArrowDown')).toBe(9);
    expect(focusDestination(4, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(7, 4, 'ArrowRight')).toBe(7);
    expect(focusDestination(1, 4, 'ArrowUp')).toBe(1);
    expect(focusDestination(14, 4, 'ArrowDown')).toBe(14);
  });

  it('leaves other keys to native input', () => {
    for (const key of ['Tab', 'Enter', ' ', 'Home', 'End', 'a']) expect(focusDestination(5, 4, key)).toBeNull();
  });
});

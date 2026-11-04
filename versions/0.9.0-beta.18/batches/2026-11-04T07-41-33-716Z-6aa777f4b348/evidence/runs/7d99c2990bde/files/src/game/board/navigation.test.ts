import { describe, expect, it } from 'vitest';
import { focusDestination } from './navigation.ts';

describe('board movement', () => {
  it('moves by row and column without revealing cards', () => {
    expect(focusDestination(5, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(5, 4, 'ArrowRight')).toBe(6);
    expect(focusDestination(5, 4, 'ArrowUp')).toBe(1);
    expect(focusDestination(5, 4, 'ArrowDown')).toBe(9);
  });
  it('stops at all four edges', () => {
    expect(focusDestination(4, 4, 'ArrowLeft')).toBe(4);
    expect(focusDestination(7, 4, 'ArrowRight')).toBe(7);
    expect(focusDestination(2, 4, 'ArrowUp')).toBe(2);
    expect(focusDestination(14, 4, 'ArrowDown')).toBe(14);
  });
  it('leaves other keys to the browser', () => {
    for (const key of ['Tab', 'Home', 'End', 'Enter', ' ', 'a']) expect(focusDestination(5, 4, key)).toBeNull();
  });
});

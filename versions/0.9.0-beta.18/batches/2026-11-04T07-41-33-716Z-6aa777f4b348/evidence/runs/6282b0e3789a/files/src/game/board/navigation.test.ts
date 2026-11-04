import { describe, expect, it } from 'vitest';
import { arrowDestination } from './navigation.ts';

describe('board focus movement', () => {
  it('moves one card in the same row or column', () => {
    expect(arrowDestination(5, 4, 'ArrowLeft')).toBe(4);
    expect(arrowDestination(5, 4, 'ArrowRight')).toBe(6);
    expect(arrowDestination(5, 4, 'ArrowUp')).toBe(1);
    expect(arrowDestination(5, 4, 'ArrowDown')).toBe(9);
  });

  it('stops at every edge and leaves other keys to the browser', () => {
    expect(arrowDestination(4, 4, 'ArrowLeft')).toBe(4);
    expect(arrowDestination(7, 4, 'ArrowRight')).toBe(7);
    expect(arrowDestination(2, 4, 'ArrowUp')).toBe(2);
    expect(arrowDestination(14, 4, 'ArrowDown')).toBe(14);
    expect(arrowDestination(5, 4, 'Tab')).toBeNull();
    expect(arrowDestination(5, 4, 'Home')).toBeNull();
  });
});

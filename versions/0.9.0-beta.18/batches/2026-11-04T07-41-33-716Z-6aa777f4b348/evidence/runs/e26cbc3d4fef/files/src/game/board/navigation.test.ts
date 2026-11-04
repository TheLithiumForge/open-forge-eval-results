import { describe, expect, it } from 'vitest';
import { supportedSizes } from '../boardCode.ts';
import { arrowDestination } from './navigation.ts';

describe('board arrow movement', () => {
  it('moves one column or row without changing row at a horizontal edge', () => {
    expect(arrowDestination(5, 4, 'ArrowLeft')).toBe(4);
    expect(arrowDestination(5, 4, 'ArrowRight')).toBe(6);
    expect(arrowDestination(5, 4, 'ArrowUp')).toBe(1);
    expect(arrowDestination(5, 4, 'ArrowDown')).toBe(9);
    expect(arrowDestination(3, 4, 'ArrowRight')).toBe(3);
    expect(arrowDestination(4, 4, 'ArrowLeft')).toBe(4);
  });

  it.each(supportedSizes)('stops at all four edges of a board of size %i', (size) => {
    const last = size * size - 1;
    expect(arrowDestination(0, size, 'ArrowLeft')).toBe(0);
    expect(arrowDestination(0, size, 'ArrowUp')).toBe(0);
    expect(arrowDestination(last, size, 'ArrowRight')).toBe(last);
    expect(arrowDestination(last, size, 'ArrowDown')).toBe(last);
  });

  it.each(['Tab', 'Enter', ' ', 'Home', 'End', 'a'])('leaves %j to native input', (key) => {
    expect(arrowDestination(5, 4, key)).toBeNull();
  });
});

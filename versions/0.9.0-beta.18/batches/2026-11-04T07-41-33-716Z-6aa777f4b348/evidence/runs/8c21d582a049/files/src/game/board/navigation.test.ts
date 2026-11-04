import { describe, expect, it } from 'vitest';
import { SIZES } from '../boardCode.ts';
import { arrowDestination } from './navigation.ts';

describe('board arrow movement (I05–I08)', () => {
  it.each(SIZES)('stops at edges and moves only within a row or column at size %i', size => {
    expect(arrowDestination(0, size, 'ArrowLeft')).toBe(0);
    expect(arrowDestination(0, size, 'ArrowUp')).toBe(0);
    expect(arrowDestination(size - 1, size, 'ArrowRight')).toBe(size - 1);
    expect(arrowDestination(size * size - 1, size, 'ArrowDown')).toBe(size * size - 1);
    expect(arrowDestination(size + 1, size, 'ArrowLeft')).toBe(size);
    expect(arrowDestination(size + 1, size, 'ArrowRight')).toBe(size + 2);
    expect(arrowDestination(size + 1, size, 'ArrowUp')).toBe(1);
    expect(arrowDestination(size + 1, size, 'ArrowDown')).toBe(size * 2 + 1);
  });
  it('does not handle native exit, activation or other browser keys', () => {
    for (const key of ['Tab', 'Enter', ' ', 'Home', 'End', 'PageDown', 'a']) {
      expect(arrowDestination(5, 4, key)).toBeNull();
    }
  });
});

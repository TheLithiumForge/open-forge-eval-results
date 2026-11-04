import { describe, expect, it } from 'vitest';
import { SIZES } from '../boardCode.ts';
import { arrowDestination } from './navigation.ts';

describe('board focus movement', () => {
  it.each(SIZES)('moves by row and column and stops at every size-%i edge', (size) => {
    for (let index = 0; index < size * size; index += 1) {
      const left = arrowDestination(index, size, 'ArrowLeft');
      const right = arrowDestination(index, size, 'ArrowRight');
      const up = arrowDestination(index, size, 'ArrowUp');
      const down = arrowDestination(index, size, 'ArrowDown');
      expect(left).toBe(index % size === 0 ? index : index - 1);
      expect(right).toBe(index % size === size - 1 ? index : index + 1);
      expect(up).toBe(index < size ? index : index - size);
      expect(down).toBe(index >= size * (size - 1) ? index : index + size);
    }
  });
  it('leaves activation and every other key to the native control', () => {
    for (const key of ['Tab', 'Enter', ' ', 'Home', 'End', 'a', 'Escape']) {
      expect(arrowDestination(5, 4, key)).toBeNull();
    }
  });
});

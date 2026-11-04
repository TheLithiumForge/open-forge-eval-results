import { describe, expect, it } from 'vitest';
import { moveFocus } from './navigation.ts';

describe('grid focus movement', () => {
  it('moves by row and column, stopping at each edge', () => {
    expect(moveFocus(5, 4, 'ArrowLeft')).toBe(4);
    expect(moveFocus(5, 4, 'ArrowRight')).toBe(6);
    expect(moveFocus(5, 4, 'ArrowUp')).toBe(1);
    expect(moveFocus(5, 4, 'ArrowDown')).toBe(9);
    expect(moveFocus(4, 4, 'ArrowLeft')).toBe(4);
    expect(moveFocus(3, 4, 'ArrowRight')).toBe(3);
    expect(moveFocus(1, 4, 'ArrowUp')).toBe(1);
    expect(moveFocus(13, 4, 'ArrowDown')).toBe(13);
  });
});

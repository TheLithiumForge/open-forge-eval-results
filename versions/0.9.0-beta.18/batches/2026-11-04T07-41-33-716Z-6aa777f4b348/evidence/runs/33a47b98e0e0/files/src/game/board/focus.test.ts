import { describe, expect, it } from 'vitest';
import { nextBoardFocus } from './focus.ts';

describe('row and column board focus', () => {
  it('moves within rows and columns without wrapping', () => {
    expect(nextBoardFocus(5, 4, 'ArrowLeft')).toBe(4);
    expect(nextBoardFocus(5, 4, 'ArrowRight')).toBe(6);
    expect(nextBoardFocus(5, 4, 'ArrowUp')).toBe(1);
    expect(nextBoardFocus(5, 4, 'ArrowDown')).toBe(9);
    expect(nextBoardFocus(3, 4, 'ArrowRight')).toBe(3);
    expect(nextBoardFocus(12, 4, 'ArrowLeft')).toBe(12);
    expect(nextBoardFocus(0, 4, 'ArrowUp')).toBe(0);
    expect(nextBoardFocus(15, 4, 'ArrowDown')).toBe(15);
  });

  it('ignores keys outside the four board directions and invalid indexes', () => {
    expect(nextBoardFocus(5, 4, 'Enter')).toBeNull();
    expect(nextBoardFocus(-1, 4, 'ArrowRight')).toBeNull();
    expect(nextBoardFocus(16, 4, 'ArrowLeft')).toBeNull();
  });
});

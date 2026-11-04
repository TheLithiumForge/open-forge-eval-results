import { describe, expect, it } from 'vitest';
import { formatTime } from '../timeFormat.ts';

describe('clock display', () => {
  it('rounds down and lets minutes continue past an hour', () => {
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(3_600_000)).toBe('60:00');
    expect(formatTime(359_999_999)).toBe('5999:59');
  });
});

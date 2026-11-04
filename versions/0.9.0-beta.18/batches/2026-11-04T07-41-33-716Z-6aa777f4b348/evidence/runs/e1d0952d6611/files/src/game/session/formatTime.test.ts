import { describe, expect, it } from 'vitest';
import { formatTime } from './formatTime.ts';

describe('display elapsed time', () => {
  it('rounds down seconds and lets minutes pass an hour', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(59_999)).toBe('0:59');
    expect(formatTime(60_999)).toBe('1:00');
    expect(formatTime(3_600_000)).toBe('60:00');
  });
});

import { describe, expect, it } from 'vitest';
import { formatElapsedTime } from './formatTime.ts';

describe('elapsed time display', () => {
  it('rounds down to seconds and allows minutes above one hour', () => {
    expect(formatElapsedTime(999)).toBe('0:00');
    expect(formatElapsedTime(61_999)).toBe('1:01');
    expect(formatElapsedTime(3_600_000)).toBe('60:00');
  });
});

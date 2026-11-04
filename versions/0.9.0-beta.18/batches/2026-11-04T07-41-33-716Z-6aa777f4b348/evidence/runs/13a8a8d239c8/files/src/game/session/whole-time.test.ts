import { describe, expect, it } from 'vitest';
import { accumulateMilliseconds } from './whole-time.ts';

describe('active clock precision', () => {
  it('carries fractional time across render ticks and pauses', () => {
    const first = accumulateMilliseconds(0.4, 0);
    const second = accumulateMilliseconds(0.4, first.remainder);
    const third = accumulateMilliseconds(0.4, second.remainder);
    expect([first.wholeMilliseconds, second.wholeMilliseconds, third.wholeMilliseconds]).toEqual([0, 0, 1]);
    expect(third.remainder).toBeCloseTo(0.2);
  });

  it('ignores a backwards clock sample and bounds an unsafe delay', () => {
    expect(accumulateMilliseconds(-20, 0.5)).toEqual({ wholeMilliseconds: 0, remainder: 0.5 });
    expect(accumulateMilliseconds(Infinity, 0)).toEqual({ wholeMilliseconds: Number.MAX_SAFE_INTEGER, remainder: 0 });
  });
});

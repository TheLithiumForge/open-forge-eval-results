import { describe, expect, it } from 'vitest';
import { clockStep, EMPTY_CLOCK, formatElapsed, nextClockDelay, pauseClock, resumeClock } from './activeClock.ts';

describe('active clock accounting', () => {
  it('carries fractional milliseconds instead of losing them per render', () => {
    let cursor = clockStep(EMPTY_CLOCK, 10).cursor;
    let step = clockStep(cursor, 10.4);
    cursor = step.cursor;
    expect(step.elapsedWholeMs).toBe(0);
    step = clockStep(cursor, 10.8);
    cursor = step.cursor;
    expect(step.elapsedWholeMs).toBe(0);
    step = clockStep(cursor, 11.2);
    expect(step.elapsedWholeMs).toBe(1);
  });

  it('excludes time spent hidden and never moves backward', () => {
    let cursor = clockStep(EMPTY_CLOCK, 100).cursor;
    let step = clockStep(cursor, 450.5);
    cursor = pauseClock(step.cursor);
    expect(step.elapsedWholeMs).toBe(350);
    step = clockStep(cursor, 10_000);
    cursor = step.cursor;
    expect(step.elapsedWholeMs).toBe(0);
    step = clockStep(cursor, 10_010);
    expect(step.elapsedWholeMs).toBe(10);
    expect(clockStep(step.cursor, 9).elapsedWholeMs).toBe(0);
  });

  it('anchors the resumed clock immediately and preserves partial active time', () => {
    let cursor = clockStep(EMPTY_CLOCK, 12).cursor;
    cursor = clockStep(cursor, 12.75).cursor;
    cursor = resumeClock(pauseClock(cursor), 20_000);
    const step = clockStep(cursor, 20_000.5);
    expect(step.elapsedWholeMs).toBe(1);
    expect(step.cursor.lastTimeMs).toBe(20_000.5);
  });

  it('formats elapsed time with unbounded minutes', () => {
    expect(formatElapsed(3_600_000)).toBe('60:00');
    expect(formatElapsed(1_999)).toBe('0:01');
  });

  it('schedules a pending mismatch at its remaining active deadline', () => {
    expect(nextClockDelay({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 })).toBe(1);
    expect(nextClockDelay({ kind: 'mismatch', first: 0, second: 1, remainingMs: 100 })).toBe(25);
  });
});

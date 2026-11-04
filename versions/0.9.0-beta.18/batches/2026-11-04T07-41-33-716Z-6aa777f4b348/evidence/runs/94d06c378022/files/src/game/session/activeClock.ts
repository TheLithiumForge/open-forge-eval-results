import type { Selection } from '../state.ts';

export interface ClockCursor {
  readonly lastTimeMs: number | null;
  readonly fractionalMs: number;
}

export interface ClockStep {
  readonly cursor: ClockCursor;
  readonly elapsedWholeMs: number;
}

export const EMPTY_CLOCK: ClockCursor = Object.freeze({ lastTimeMs: null, fractionalMs: 0 });

export function clockStep(cursor: ClockCursor, nowMs: number): ClockStep {
  if (!Number.isFinite(nowMs) || nowMs < 0) return { cursor, elapsedWholeMs: 0 };
  if (cursor.lastTimeMs === null) {
    return { cursor: { lastTimeMs: nowMs, fractionalMs: cursor.fractionalMs }, elapsedWholeMs: 0 };
  }
  const delta = Math.max(0, nowMs - cursor.lastTimeMs) + cursor.fractionalMs;
  const elapsedWholeMs = Math.floor(delta);
  return {
    cursor: { lastTimeMs: nowMs, fractionalMs: delta - elapsedWholeMs },
    elapsedWholeMs
  };
}

export function pauseClock(cursor: ClockCursor): ClockCursor {
  return { lastTimeMs: null, fractionalMs: cursor.fractionalMs };
}

export function resumeClock(cursor: ClockCursor, nowMs: number): ClockCursor {
  return { lastTimeMs: nowMs, fractionalMs: cursor.fractionalMs };
}

export function nextClockDelay(selection: Selection): number {
  return selection.kind === 'mismatch' ? Math.min(25, selection.remainingMs) : 25;
}

export function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

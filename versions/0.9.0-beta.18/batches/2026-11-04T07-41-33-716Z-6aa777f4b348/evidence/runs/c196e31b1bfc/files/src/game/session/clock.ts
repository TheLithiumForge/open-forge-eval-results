import { MAX_ELAPSED_MS } from "../state.ts";

export interface ClockDelta {
  readonly milliseconds: number;
  readonly fraction: number;
}

export function takeClockDelta(previous: number, current: number, fraction: number): ClockDelta {
  const exact = Math.max(0, current - previous) + fraction;
  const milliseconds = Math.floor(exact);
  return { milliseconds, fraction: exact - milliseconds };
}

export function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(Math.min(MAX_ELAPSED_MS, milliseconds) / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

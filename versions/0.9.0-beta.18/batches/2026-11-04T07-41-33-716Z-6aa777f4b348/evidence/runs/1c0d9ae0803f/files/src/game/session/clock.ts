export type ActiveClock = Readonly<{ lastNow: number; remainderMs: number }>;
export type ClockStep = Readonly<{ clock: ActiveClock; milliseconds: number }>;

export function createActiveClock(now: number): ActiveClock {
  return Object.freeze({ lastNow: now, remainderMs: 0 });
}

export function stepActiveClock(clock: ActiveClock, now: number, active: boolean): ClockStep {
  const timestamp = Number.isFinite(now) ? Math.max(clock.lastNow, now) : clock.lastNow;
  const accumulated = active
    ? clock.remainderMs + timestamp - clock.lastNow
    : clock.remainderMs;
  const milliseconds = Math.floor(accumulated);
  return Object.freeze({
    clock: Object.freeze({ lastNow: timestamp, remainderMs: accumulated - milliseconds }),
    milliseconds,
  });
}

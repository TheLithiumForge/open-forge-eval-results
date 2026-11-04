export interface ActiveClock {
  readonly at: number;
  readonly active: boolean;
}

export function sampleActiveClock(clock: ActiveClock, at: number, active: boolean) {
  const nextAt = Math.max(clock.at, at);
  return {
    clock: { at: nextAt, active },
    milliseconds: clock.active ? nextAt - clock.at : 0,
  };
}

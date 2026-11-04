import { describe, expect, it } from "vitest";
import { createActiveClock, stepActiveClock } from "./clock.ts";

describe("active session clock", () => {
  it("retains fractional active milliseconds without counting hidden time", () => {
    const first = stepActiveClock(createActiveClock(0), 12.4, true);
    expect(first.milliseconds).toBe(12);
    const hidden = stepActiveClock(first.clock, 50_000, false);
    expect(hidden.milliseconds).toBe(0);
    const resumed = stepActiveClock(hidden.clock, 50_000.4, true);
    expect(resumed.milliseconds).toBe(0);
    const rounded = stepActiveClock(resumed.clock, 50_000.6, true);
    expect(rounded.milliseconds).toBe(1);
  });

  it("ignores a backwards or nonfinite clock reading", () => {
    const clock = stepActiveClock(createActiveClock(10), 20, true).clock;
    expect(stepActiveClock(clock, 15, true)).toEqual({
      clock: { lastNow: 20, remainderMs: 0 }, milliseconds: 0,
    });
    expect(stepActiveClock(clock, Number.NaN, true).milliseconds).toBe(0);
  });
});

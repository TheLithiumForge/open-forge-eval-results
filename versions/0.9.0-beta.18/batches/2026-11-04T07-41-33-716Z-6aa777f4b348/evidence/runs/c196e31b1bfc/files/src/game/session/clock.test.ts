import { describe, expect, it } from "vitest";
import { formatElapsedTime, takeClockDelta } from "./clock.ts";

describe("active game time", () => {
  it("keeps fractional milliseconds so timer cadence does not lose time", () => {
    const first = takeClockDelta(0, 0.4, 0);
    const second = takeClockDelta(0.4, 0.8, first.fraction);
    const third = takeClockDelta(0.8, 1.3, second.fraction);
    expect([first.milliseconds, second.milliseconds, third.milliseconds]).toEqual([0, 0, 1]);
    expect(third.fraction).toBeCloseTo(0.3);
  });

  it("formats elapsed minutes without rolling over and rounds seconds down", () => {
    expect(formatElapsedTime(3599_999)).toBe("59:59");
    expect(formatElapsedTime(3_600_999)).toBe("60:00");
    expect(formatElapsedTime(359_999_999)).toBe("5999:59");
  });
});

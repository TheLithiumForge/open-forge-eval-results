import { describe, expect, it } from "vitest";
import { formatTime } from "./formatTime.ts";

describe("game time display", () => {
  it("floors seconds and lets minutes pass one hour", () => {
    expect(formatTime(999)).toBe("0:00");
    expect(formatTime(3_600_999)).toBe("60:00");
  });
});

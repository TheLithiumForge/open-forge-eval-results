import { describe, expect, it } from "vitest";
import { formatElapsed } from "./clock.ts";

describe("clock display", () => {
  it("rounds down and allows minutes beyond an hour", () => {
    expect(formatElapsed(999)).toBe("0:00");
    expect(formatElapsed(3_600_000)).toBe("60:00");
    expect(formatElapsed(3_661_999)).toBe("61:01");
  });
});

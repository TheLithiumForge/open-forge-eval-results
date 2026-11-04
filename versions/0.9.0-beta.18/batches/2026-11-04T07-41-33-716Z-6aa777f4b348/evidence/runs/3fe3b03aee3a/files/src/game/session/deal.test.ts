import { describe, expect, it, vi } from "vitest";
import { formatElapsed, freshBoardCode } from "./deal.ts";

describe("session deal helpers", () => {
  it("avoids repeating the current seed when a fresh deal draws a collision", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    expect(freshBoardCode(4, "np1-4-1")).toBe("np1-4-2");
    random.mockRestore();
  });

  it("keeps final and long elapsed time in the documented minutes format", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(3_600_000)).toBe("60:00");
    expect(formatElapsed(359_999_999)).toBe("5999:59");
  });
});

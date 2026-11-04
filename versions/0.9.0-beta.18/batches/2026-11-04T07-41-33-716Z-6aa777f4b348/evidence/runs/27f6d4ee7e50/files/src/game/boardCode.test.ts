import { describe, expect, it } from "vitest";
import { BOARD_SIZES, isBoardSize, parseBoardCode } from "./boardCode.ts";

describe("parseBoardCode", () => {
  it("accepts every supported size and the seed bounds", () => {
    for (const size of BOARD_SIZES) {
      expect(parseBoardCode(`np1-${size}-1`)?.size).toBe(size);
    }
    expect(parseBoardCode("np1-4-2147483646")?.seed).toBe(2_147_483_646);
  });

  it.each([
    "np1-4-0", "np1-4-2147483647", "np1-5-1", "np1-04-1",
    "np1-4-01", " np1-4-1", "np1-4-1 ", "np1-4-1\n", "np1-4-1\r", "np1-4-1\r\n", "np2-4-1",
  ])("rejects noncanonical board code %j", (code) => {
    expect(parseBoardCode(code)).toBeNull();
  });

  it("narrows supported sizes", () => {
    expect(isBoardSize(16)).toBe(true);
    expect(isBoardSize(5)).toBe(false);
    expect(isBoardSize("4")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { createDeck, parseBoardCode } from "./board-code";

describe("board codes and version 1 decks", () => {
  it("matches the documented independent deck vector", () => {
    expect(createDeck("np1-4-1")).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("accepts only supported sizes and canonical bounded seeds", () => {
    expect(parseBoardCode("np1-16-2147483646")).toEqual({ code: "np1-16-2147483646", size: 16, seed: 2_147_483_646 });
    expect(parseBoardCode(" np1-16-2147483646 ")).toBeNull();
    expect(parseBoardCode("np1-4-01")).toBeNull();
    expect(parseBoardCode("np1-5-1")).toBeNull();
    expect(parseBoardCode("np1-4-2147483647")).toBeNull();
    expect(parseBoardCode("NP1-4-1")).toBeNull();
  });

  it("creates every pair exactly twice for each supported size", () => {
    for (const side of [4, 6, 8, 10, 12, 14, 16]) {
      const deck = createDeck(`np1-${side}-19`)!;
      expect(deck).toHaveLength(side * side);
      expect(new Set(deck).size).toBe((side * side) / 2);
      for (let face = 0; face < (side * side) / 2; face += 1) {
        expect(deck.filter((value) => value === face)).toHaveLength(2);
      }
    }
  });
});

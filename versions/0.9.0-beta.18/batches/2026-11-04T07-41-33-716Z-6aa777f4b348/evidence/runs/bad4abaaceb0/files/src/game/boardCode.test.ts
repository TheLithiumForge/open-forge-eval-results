import { describe, expect, it } from "vitest";
import { GRID_SIZES, MAX_SEED } from "./constants.ts";
import { parseBoardCode } from "./boardCode.ts";
import { generateDeck } from "./deck.ts";

describe("board codes and generation", () => {
  it("parses only canonical supported codes", () => {
    expect(parseBoardCode("np1-4-1")).toEqual({ code: "np1-4-1", size: 4, seed: 1 });
    for (const code of [" np1-4-1", "np1-4-1\n", "np1-04-1", "np1-4-01", "np2-4-1", "np1-5-1", "np1-4-0", "np1-4-2147483647"]) {
      expect(parseBoardCode(code)).toBeNull();
    }
    expect(parseBoardCode(`np1-16-${MAX_SEED}`)?.seed).toBe(MAX_SEED);
  });

  it("matches the specified independent seed 1 deck vector", () => {
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("matches a separately calculated 16x16 rejection-sampling vector", () => {
    expect(generateDeck(16, 147827)).toEqual([
      118, 123, 35, 55, 69, 36, 94, 123, 120, 94, 23, 107, 14, 85, 24, 64,
      97, 38, 11, 10, 67, 23, 98, 12, 77, 39, 112, 59, 107, 117, 33, 100,
      17, 113, 78, 89, 68, 3, 70, 110, 125, 13, 7, 124, 91, 37, 104, 32,
      64, 89, 61, 24, 84, 92, 14, 77, 105, 126, 126, 44, 39, 62, 121, 65,
      52, 114, 56, 88, 8, 84, 33, 98, 102, 60, 115, 30, 114, 115, 19, 60,
      19, 5, 97, 29, 27, 75, 20, 72, 63, 57, 109, 6, 25, 31, 48, 1,
      48, 4, 66, 116, 109, 108, 37, 46, 52, 28, 47, 34, 106, 108, 12, 9,
      93, 96, 79, 17, 50, 20, 15, 111, 56, 9, 38, 82, 76, 28, 70, 103,
      58, 32, 34, 4, 54, 55, 106, 68, 18, 95, 40, 90, 99, 31, 41, 100,
      81, 58, 74, 73, 16, 63, 42, 25, 16, 61, 8, 42, 51, 3, 95, 85,
      54, 118, 0, 46, 92, 2, 43, 43, 26, 113, 99, 29, 47, 71, 88, 101,
      127, 83, 59, 117, 102, 105, 119, 18, 44, 121, 86, 22, 49, 50, 65, 30,
      122, 41, 80, 53, 103, 22, 79, 66, 90, 93, 76, 6, 101, 72, 67, 87,
      21, 7, 125, 127, 69, 45, 62, 35, 13, 78, 11, 110, 86, 1, 45, 116,
      112, 82, 96, 51, 5, 36, 120, 26, 124, 119, 15, 0, 10, 83, 57, 81,
      104, 71, 80, 73, 21, 91, 49, 53, 40, 74, 122, 27, 111, 75, 87, 2,
    ]);
  });

  it("creates paired face counts for every supported size", () => {
    for (const size of GRID_SIZES) {
      const deck = generateDeck(size, 123456789);
      expect(deck).toHaveLength(size * size);
      const counts = new Map<number, number>();
      for (const face of deck) counts.set(face, (counts.get(face) ?? 0) + 1);
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
    }
  });
});

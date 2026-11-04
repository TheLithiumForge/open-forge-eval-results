import { describe, expect, it } from "vitest";
import { parseBoardCode } from "./boardCode.ts";
import { generateDeck } from "./deck.ts";
import { SIDE_LENGTHS } from "./model.ts";

describe("board codes and version 1 deal generation", () => {
  it("accepts only canonical supported codes and in-range seeds", () => {
    expect(parseBoardCode("np1-4-1")).toEqual({ side: 4, seed: 1, code: "np1-4-1" });
    for (const invalid of ["np1-04-1", "np1-4-0", "np1-4-01", "np1-5-1", "np1-4-2147483647", "NP1-4-1"]) {
      expect(parseBoardCode(invalid)).toBeNull();
    }
  });

  it("matches the independent documented np1-4-1 vector", () => {
    const board = parseBoardCode("np1-4-1");
    expect(board && generateDeck(board)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("contains two of every face at every supported size and repeats deterministically", () => {
    for (const side of SIDE_LENGTHS) {
      const board = parseBoardCode(`np1-${side}-81`);
      expect(board).not.toBeNull();
      const first = generateDeck(board!);
      expect(generateDeck(board!)).toEqual(first);
      expect(first).toHaveLength(side * side);
      expect(new Set(first).size).toBe(side * side / 2);
      for (const face of first) expect(first.filter((item) => item === face)).toHaveLength(2);
    }
  });
});

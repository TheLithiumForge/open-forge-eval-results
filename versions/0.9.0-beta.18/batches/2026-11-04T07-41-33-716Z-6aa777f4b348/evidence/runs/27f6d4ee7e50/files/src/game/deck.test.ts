import { describe, expect, it } from "vitest";
import { parseBoardCode } from "./boardCode.ts";
import { createDeck } from "./deck.ts";

describe("createDeck", () => {
  it("matches the version 1 independent vector", () => {
    const board = parseBoardCode("np1-4-1");
    expect(board).not.toBeNull();
    if (board === null) return;
    expect(createDeck(board)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("matches independent vectors that exercise draw rejection", () => {
    const four = parseBoardCode("np1-4-739806647");
    const six = parseBoardCode("np1-6-1");
    expect(four).not.toBeNull();
    expect(six).not.toBeNull();
    if (four === null || six === null) return;
    expect(createDeck(four)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    expect(createDeck(six)).toEqual([
      1, 9, 10, 14, 2, 17, 15, 11, 12, 5, 4, 6, 8, 17, 1, 12, 0, 7,
      10, 3, 16, 9, 3, 5, 13, 14, 4, 7, 13, 11, 16, 0, 8, 2, 6, 15,
    ]);
  });

  it("pairs all face identities exactly twice for every size", () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16]) {
      const board = parseBoardCode(`np1-${size}-2147483646`);
      expect(board).not.toBeNull();
      if (board === null) continue;
      const deck = createDeck(board);
      expect(deck).toHaveLength(size * size);
      for (let face = 0; face < deck.length / 2; face += 1) {
        expect(deck.filter((item) => item === face)).toHaveLength(2);
      }
      expect(Object.isFrozen(deck)).toBe(true);
    }
  });
});

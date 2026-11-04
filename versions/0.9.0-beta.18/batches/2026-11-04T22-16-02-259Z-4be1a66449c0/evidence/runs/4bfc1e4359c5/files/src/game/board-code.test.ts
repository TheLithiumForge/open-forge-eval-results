import { describe, expect, it } from "vitest";
import { generateDeck, parseBoardCode } from "./board-code.ts";

describe("board codes", () => {
  it("matches the independent version 1 literal vector", () => {
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("generates two copies of every face at every supported size", () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16] as const) {
      const deck = generateDeck(size, 2_147_483_646);
      expect(deck).toHaveLength(size * size);
      expect(new Set(deck).size).toBe(size * size / 2);
      expect([...new Set(deck)].every((face) => deck.filter((item) => item === face).length === 2)).toBe(true);
    }
  });

  it.each(["np1-4-01", "np1-4-0", "np1-5-1", "np1-16-2147483647", "np2-4-1", "np1-4-1 "]) (
    "rejects malformed code %s", (code) => expect(parseBoardCode(code)).toBeNull(),
  );

  it("parses a supported board into immutable data", () => {
    const board = parseBoardCode("np1-4-1");
    expect(board?.size).toBe(4);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board?.deck)).toBe(true);
  });
});

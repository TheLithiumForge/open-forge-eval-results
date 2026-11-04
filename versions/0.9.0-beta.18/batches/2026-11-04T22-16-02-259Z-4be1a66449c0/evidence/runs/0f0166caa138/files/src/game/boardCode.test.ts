import { describe, expect, it } from "vitest";
import { createGame, generateDeck, parseBoardCode } from "./boardCode.ts";

describe("board codes", () => {
  it("accepts supported sizes and bounded decimal seeds", () => {
    expect(parseBoardCode("np1-4-1")?.size).toBe(4);
    expect(parseBoardCode("np1-16-2147483646")?.seed).toBe(2_147_483_646);
    for (const code of ["np1-5-1", "np1-4-0", "np1-4-01", "np1-4-2147483647", " np1-4-1"]) {
      expect(parseBoardCode(code)).toBeNull();
    }
  });

  it("matches the independent version 1 deck vector", () => {
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("creates two copies of every face", () => {
    const game = createGame("np1-6-23");
    expect(game?.deck).toHaveLength(36);
    expect(new Set(game?.deck).size).toBe(18);
    for (const face of game?.deck ?? []) {
      expect(game?.deck.filter((entry) => entry === face)).toHaveLength(2);
    }
  });
});

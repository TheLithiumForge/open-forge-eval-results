import { describe, expect, it } from "vitest";
import { createGame, parseBoardCode, SUPPORTED_SIZES } from "./board.ts";

describe("board codes and seeded deals", () => {
  it("matches the documented Park–Miller shuffle vector", () => {
    expect(createGame("np1-4-1")?.board.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("rejects the first out-of-range shuffle draw before modulo reduction", () => {
    expect(createGame("np1-4-739806647")?.board.deck).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });

  it("builds complete pairs for every supported size", () => {
    for (const size of SUPPORTED_SIZES) {
      const game = createGame(`np1-${size}-2147483646`);
      expect(game?.board.deck).toHaveLength(size * size);
      const counts = new Map<number, number>();
      for (const face of game?.board.deck ?? []) counts.set(face, (counts.get(face) ?? 0) + 1);
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
    }
  });

  it("accepts only canonical supported codes and safe seeds", () => {
    expect(parseBoardCode("np1-4-1")?.code).toBe("np1-4-1");
    for (const bad of [" np1-4-1", "np1-4-1\n", "np1-04-1", "np1-5-1", "np1-4-0", "np1-4-01", "np1-4-2147483647", "np2-4-1"]) {
      expect(parseBoardCode(bad)).toBeNull();
    }
  });
});

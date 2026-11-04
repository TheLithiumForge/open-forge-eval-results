import { describe, expect, it } from "vitest";
import { createBoard, generateDeck, parseBoardCode } from "./boardCode.js";

describe("board codes", () => {
  it("recreates the documented Park-Miller deal", () => {
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(createBoard("np1-4-1")?.deck).toHaveLength(16);
  });

  it("accepts only supported sizes and canonical seeds", () => {
    expect(parseBoardCode("np1-16-2147483646")?.size).toBe(16);
    for (const code of ["np1-5-1", "np1-4-0", "np1-4-01", "np1-4-2147483647", "np1-4-1 "]) {
      expect(parseBoardCode(code)).toBeNull();
    }
  });

  it("makes exactly two copies of each face on every size", () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16] as const) {
      const deck = generateDeck(size, 17);
      expect(deck).toHaveLength(size * size);
      const counts = new Map<number, number>();
      deck.forEach((face) => counts.set(face, (counts.get(face) ?? 0) + 1));
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
    }
  });
});

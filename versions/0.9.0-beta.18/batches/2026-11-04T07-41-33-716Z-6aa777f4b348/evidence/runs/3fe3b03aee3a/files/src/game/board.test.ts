import { describe, expect, it } from "vitest";
import { createBoard, createGame, parseBoardCode } from "./board.ts";
import { supportedSizes } from "./types.ts";

describe("board codes and version 1 generation", () => {
  it("matches independent literal deals", () => {
    expect(createBoard("np1-4-1")?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(createBoard("np1-4-2")?.deck).toEqual([2, 0, 1, 4, 7, 4, 5, 6, 5, 7, 2, 0, 3, 1, 3, 6]);
    expect(createBoard("np1-6-1")?.deck).toEqual([
      1, 9, 10, 14, 2, 17, 15, 11, 12, 5, 4, 6, 8, 17, 1, 12, 0, 7,
      10, 3, 16, 9, 3, 5, 13, 14, 4, 7, 13, 11, 16, 0, 8, 2, 6, 15
    ]);
  });

  it("deals every face twice on every supported size and freezes the board", () => {
    for (const size of supportedSizes) {
      const board = createBoard(`np1-${size}-2147483646`);
      expect(board?.deck).toHaveLength(size * size);
      const faces = new Map<number, number>();
      for (const face of board?.deck ?? []) faces.set(face, (faces.get(face) ?? 0) + 1);
      expect([...faces.values()].every((count) => count === 2)).toBe(true);
      expect(Object.isFrozen(board?.deck)).toBe(true);
    }
  });

  it("accepts only canonical supported codes with bounded seeds", () => {
    for (const code of ["np1-4-0", "np1-4-01", "np1-5-1", "np1-4-2147483647", "np1-4-1\n", " np1-4-1"]) {
      expect(parseBoardCode(code)).toBeNull();
    }
    expect(parseBoardCode("np1-16-2147483646")).toEqual({ code: "np1-16-2147483646", size: 16, seed: 2147483646 });
    expect(() => createGame("invalid")).toThrow("Invalid board code.");
  });
});

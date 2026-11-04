import { describe, expect, it } from "vitest";
import { parseBoardCode } from "./code.ts";
import { generateDeck, nextParkMillerState } from "./generate.ts";

describe("version 1 board generation", () => {
  it("uses the specified Park-Miller states", () => {
    const states = [16807, 282475249, 1622650073, 984943658, 1144108930];
    let state = 1;
    for (const expected of states) {
      state = nextParkMillerState(state);
      expect(state).toBe(expected);
    }
  });

  it("matches the independent np1-4-1 deck vector", () => {
    const board = parseBoardCode("np1-4-1");
    expect(board).not.toBeNull();
    if (board === null) return;
    expect(generateDeck(board)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("gives every face exactly two positions across supported sizes", () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16]) {
      const board = parseBoardCode(`np1-${size}-2147483646`);
      expect(board).not.toBeNull();
      if (board === null) continue;
      const frequencies = new Map<number, number>();
      for (const face of generateDeck(board)) frequencies.set(face, (frequencies.get(face) ?? 0) + 1);
      expect([...frequencies.values()].every((count) => count === 2)).toBe(true);
    }
  });
});

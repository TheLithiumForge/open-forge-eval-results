import { describe, expect, it } from "vitest";
import { BOARD_SIZES, createBoard, parseBoardCode, parkMillerNext } from "./board.ts";

describe("board codes and deals", () => {
  it("parses only supported sizes and canonical seed decimals", () => {
    expect(parseBoardCode("np1-4-1")).toEqual({ size: 4, seed: 1 });
    for (const code of ["np1-5-1", "np1-4-0", "np1-4-01", " np1-4-1", "np1-4-2147483647"]) {
      expect(parseBoardCode(code)).toBeNull();
    }
  });

  it("matches the independent Park-Miller and published deck vectors", () => {
    const states = [16_807, 282_475_249, 1_622_650_073, 984_943_658, 1_144_108_930];
    let state = 1;
    for (const expected of states) {
      state = parkMillerNext(state);
      expect(state).toBe(expected);
    }
    expect(createBoard("np1-4-1")?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("deals every supported grid with exactly two of each face", () => {
    for (const size of BOARD_SIZES) {
      const board = createBoard(`np1-${size}-2147483646`);
      expect(board?.deck).toHaveLength(size * size);
      const counts = new Map<number, number>();
      for (const face of board?.deck ?? []) counts.set(face, (counts.get(face) ?? 0) + 1);
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
    }
  });

  it("keeps the board and its deck immutable", () => {
    const board = createBoard("np1-4-1");
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board?.deck)).toBe(true);
  });
});

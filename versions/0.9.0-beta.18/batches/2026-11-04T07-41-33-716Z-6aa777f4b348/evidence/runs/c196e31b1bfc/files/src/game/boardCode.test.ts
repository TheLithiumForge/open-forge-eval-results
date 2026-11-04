import { describe, expect, it } from "vitest";
import { generateDeck, nextParkMillerState, parseBoardCode, BOARD_SIZES } from "./boardCode.ts";

describe("version 1 board codes", () => {
  it("uses the published Park-Miller sequence", () => {
    let state = 1;
    const actual: number[] = [];
    for (let count = 0; count < 5; count += 1) {
      state = nextParkMillerState(state);
      actual.push(state);
    }
    expect(actual).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });

  it("matches the independent documented seed 1 deck", () => {
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it("makes two of every face at each supported size", () => {
    for (const size of BOARD_SIZES) {
      const deck = generateDeck(size, 314159);
      expect(deck).toHaveLength(size * size);
      expect(new Set(deck).size).toBe((size * size) / 2);
      for (const face of deck) expect(deck.filter((other) => other === face)).toHaveLength(2);
    }
  });

  it("rejects malformed and out-of-range codes without trimming", () => {
    for (const code of [" np1-4-1", "np1-4-1 ", "np1-04-1", "np1-5-1", "np1-4-0", "np1-4-01", "np1-4-2147483647", "np1-4-1x"]) {
      expect(parseBoardCode(code)).toBeNull();
    }
    expect(parseBoardCode("np1-4-2147483646")).not.toBeNull();
  });
});

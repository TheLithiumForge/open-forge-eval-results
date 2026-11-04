import { describe, expect, it } from "vitest";
import { createGame } from "./boardCode.ts";
import { activateCard, advanceGame, ELAPSED_CAP_MS, isWon, MOVE_CAP } from "./transitions.ts";

describe("card transitions", () => {
  it("ignores a repeated first reveal and counts the second distinct reveal once", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixture invalid");
    const one = activateCard(initial, 0);
    expect(activateCard(one, 0)).toBe(one);
    expect(activateCard(one, 11).moves).toBe(1);
  });

  it("keeps matches and closes misses after 800 active milliseconds", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixture invalid");
    const match = activateCard(activateCard(initial, 2), 6);
    expect(match.matched).toEqual([2, 6]);
    const miss = activateCard(activateCard(initial, 0), 1);
    expect(miss.selection.kind).toBe("mismatch");
    expect(advanceGame(miss, 799).selection.kind).toBe("mismatch");
    expect(advanceGame(miss, 800).selection.kind).toBe("closed");
  });

  it("caps moves and elapsed time while allowing victory", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixture invalid");
    const capped = { ...initial, moves: MOVE_CAP, elapsedMs: ELAPSED_CAP_MS - 5, started: true };
    const state = advanceGame(capped, 20);
    expect(state.elapsedMs).toBe(ELAPSED_CAP_MS);
    expect(activateCard(state, 2).moves).toBe(MOVE_CAP);
    const won = [0, 11, 1, 9, 2, 6, 3, 7, 4, 5, 8, 15, 10, 14, 12, 13]
      .reduce((game, index) => activateCard(game, index), initial);
    expect(isWon(won)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { ELAPSED_LIMIT_MS, MOVE_LIMIT } from "./constants.js";
import { createGame } from "./state.js";
import { activateCard, advanceGame } from "./turns.js";

function newGame() {
  const game = createGame("np1-4-1");
  if (game === null) throw new Error("Test board is invalid.");
  return game;
}

describe("card turns and active time", () => {
  it("reveals one card without a move and ignores a repeat", () => {
    const first = activateCard(newGame(), 2);
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 2)).toBe(first);
  });

  it("matches pairs immediately and caps moves", () => {
    const first = activateCard(newGame(), 2);
    const match = activateCard(first, 6);
    expect(match.matched).toEqual([2, 6]);
    expect(match.moves).toBe(1);
    expect(activateCard(match, 2)).toBe(match);

    const capped = { ...first, moves: MOVE_LIMIT };
    expect(activateCard(capped, 0).moves).toBe(MOVE_LIMIT);
  });

  it("holds a miss for 800 active milliseconds and ignores input", () => {
    const first = activateCard(newGame(), 0);
    const miss = activateCard(first, 1);
    expect(miss.moves).toBe(1);
    expect(miss.selection).toMatchObject({ kind: "mismatch", remainingMs: 800 });
    expect(activateCard(miss, 2)).toBe(miss);
    expect(advanceGame(miss, 799).selection).toMatchObject({ remainingMs: 1 });
    expect(advanceGame(miss, 800).selection).toEqual({ kind: "closed" });
  });

  it("starts time only after the first reveal and caps elapsed time", () => {
    const initial = newGame();
    expect(advanceGame(initial, 500).elapsedMs).toBe(0);
    const running = activateCard(initial, 0);
    expect(advanceGame(running, 250).elapsedMs).toBe(250);
    const capped = { ...running, elapsedMs: ELAPSED_LIMIT_MS - 1 };
    expect(advanceGame(capped, 25).elapsedMs).toBe(ELAPSED_LIMIT_MS);
  });
});

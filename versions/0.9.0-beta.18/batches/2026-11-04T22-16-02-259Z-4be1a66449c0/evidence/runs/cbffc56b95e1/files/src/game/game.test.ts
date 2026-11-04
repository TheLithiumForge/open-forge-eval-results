import { describe, expect, it } from "vitest";
import { activateCard, advanceGame, createGame, isWon } from "./game";
import { MAX_MOVES } from "./constants";

const start = () => createGame("np1-4-1")!;

describe("game transitions and logical time", () => {
  it("ignores invalid and repeated activations without moves", () => {
    const initial = start();
    expect(activateCard(initial, -1)).toBe(initial);
    const one = activateCard(initial, 0);
    expect(activateCard(one, 0)).toBe(one);
    expect(one.moves).toBe(0);
  });

  it("matches immediately, counts moves, and keeps matched positions immutable", () => {
    const first = activateCard(activateCard(start(), 2), 6);
    expect(first.moves).toBe(1);
    expect(first.matched).toEqual(new Set([2, 6]));
    expect(first.selection).toEqual({ kind: "closed" });
    expect(activateCard(first, 2)).toBe(first);
  });

  it("closes a miss after exactly 800 active milliseconds", () => {
    const mismatch = activateCard(activateCard(start(), 0), 1);
    expect(mismatch.moves).toBe(1);
    expect(advanceGame(mismatch, 799).selection).toMatchObject({ kind: "mismatch", remainingMs: 1 });
    const closed = advanceGame(mismatch, 800);
    expect(closed.selection).toEqual({ kind: "closed" });
    expect(closed.elapsedMs).toBe(800);
  });

  it("starts the clock on first reveal, caps time and stops on completion", () => {
    const initial = start();
    expect(advanceGame(initial, 500)).toBe(initial);
    const one = activateCard(initial, 0);
    const ticking = advanceGame(one, 1_500);
    expect(ticking.elapsedMs).toBe(1_500);
    const atCap = advanceGame(ticking, 999_000_000);
    expect(atCap.elapsedMs).toBe(359_999_999);
  });

  it("caps moves and derives victory from matched positions", () => {
    const first = activateCard(start(), 2);
    const capped = { ...first, moves: MAX_MOVES };
    const won = activateCard(capped, 6);
    expect(won.moves).toBe(MAX_MOVES);
    expect(isWon(won)).toBe(false);
  });
});

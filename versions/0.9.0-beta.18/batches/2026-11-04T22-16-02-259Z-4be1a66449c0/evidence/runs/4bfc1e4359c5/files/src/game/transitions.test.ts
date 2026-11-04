import { describe, expect, it } from "vitest";
import { createGame, formatTime, isWon } from "./state.ts";
import { activateCard, advanceGame } from "./transitions.ts";

const newGame = () => createGame("np1-4-1")!;

describe("game transitions", () => {
  it("reveals one card without a move and ignores a repeated activation", () => {
    const first = activateCard(newGame(), 0);
    expect(first.selection).toEqual({ kind: "one", index: 0 });
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 0)).toBe(first);
  });

  it("matches a pair immediately and caps moves", () => {
    const first = activateCard(newGame(), 0);
    const matched = activateCard(first, 11);
    expect(matched.selection).toEqual({ kind: "closed" });
    expect(matched.matched).toEqual([0, 11]);
    expect(matched.moves).toBe(1);
    const almostCapped = { ...first, moves: 999_999 };
    expect(activateCard(almostCapped, 11).moves).toBe(999_999);
  });

  it("blocks activations during a miss and closes exactly at 800 active milliseconds", () => {
    const miss = activateCard(activateCard(newGame(), 0), 1);
    expect(miss.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: 800 });
    expect(activateCard(miss, 2)).toBe(miss);
    const before = advanceGame(miss, 799);
    expect(before.selection.kind).toBe("mismatch");
    expect(before.elapsedMs).toBe(799);
    const after = advanceGame(before, 1);
    expect(after.selection).toEqual({ kind: "closed" });
    expect(after.elapsedMs).toBe(800);
  });

  it("keeps a mismatch and the clock frozen when no active time advances", () => {
    const miss = activateCard(activateCard(newGame(), 0), 1);
    expect(advanceGame(miss, 0)).toBe(miss);
    expect(advanceGame(miss, -10)).toBe(miss);
  });

  it("formats long times and caps elapsed time", () => {
    expect(formatTime(3_600_000)).toBe("60:00");
    const started = activateCard(newGame(), 0);
    const capped = advanceGame({ ...started, elapsedMs: 359_999_000 }, 50_000);
    expect(capped.elapsedMs).toBe(359_999_999);
    expect(formatTime(capped.elapsedMs)).toBe("5999:59");
    expect(isWon(newGame())).toBe(false);
  });
});

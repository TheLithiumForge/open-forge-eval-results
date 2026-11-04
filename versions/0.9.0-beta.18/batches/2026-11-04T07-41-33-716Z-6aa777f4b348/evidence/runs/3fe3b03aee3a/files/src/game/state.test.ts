import { describe, expect, it } from "vitest";
import { createGame } from "./board.ts";
import { activateCard, advanceGame, isWon } from "./state.ts";
import { decodeSnapshot } from "./snapshot.ts";

describe("card transitions and logical time", () => {
  it("ignores repeated, matched, invalid and out-of-turn activations", () => {
    let game = createGame("np1-4-1");
    game = activateCard(game, 0);
    expect(activateCard(game, 0).moves).toBe(0);
    game = activateCard(game, 1);
    expect(game.moves).toBe(1);
    expect(game.selection.kind).toBe("mismatch");
    expect(activateCard(game, 2)).toBe(game);
    expect(activateCard(game, -1)).toBe(game);
    expect(activateCard(game, 16)).toBe(game);
    game = advanceGame(game, 800);
    expect(game.selection).toEqual({ kind: "closed" });
    expect(game.moves).toBe(1);
  });

  it("matches immediately and completes using only matched pairs", () => {
    let game = createGame("np1-4-1");
    game = activateCard(game, 2);
    game = activateCard(game, 6);
    expect(game.matched).toEqual([2, 6]);
    expect(game.selection.kind).toBe("closed");
    expect(game.moves).toBe(1);
    expect(isWon(game)).toBe(false);
  });

  it("counts active time only after play starts and stops at the cap or victory", () => {
    const fresh = createGame("np1-4-1");
    expect(advanceGame(fresh, 500).elapsedMs).toBe(0);
    const active = activateCard(fresh, 0);
    expect(advanceGame(active, 125.5).elapsedMs).toBe(125.5);
    expect(advanceGame(active, 800).selection).toEqual({ kind: "one", index: 0 });

    const capped = decodeSnapshot(JSON.stringify({ version: 1, boardCode: "np1-4-1", matched: [],
      selection: { kind: "one", index: 0 }, moves: 999999, elapsedMs: 359999998, started: true }));
    expect(capped).not.toBeNull();
    if (capped === null) throw new Error("Expected validated state");
    const finishedTurn = activateCard(capped, 11);
    expect(finishedTurn.matched).toEqual([0, 11]);
    expect(finishedTurn.moves).toBe(999999);
    expect(advanceGame(finishedTurn, 10).elapsedMs).toBe(359999999);
  });

  it("closes a pending miss with active time after the clock cap", () => {
    const capped = decodeSnapshot(JSON.stringify({ version: 1, boardCode: "np1-4-1", matched: [],
      selection: { kind: "one", index: 0 }, moves: 999999, elapsedMs: 359999999, started: true }));
    expect(capped).not.toBeNull();
    if (capped === null) throw new Error("Expected validated state");
    const mismatch = activateCard(capped, 1);
    expect(mismatch.selection.kind).toBe("mismatch");
    expect(mismatch.moves).toBe(999999);
    const nearlyClosed = advanceGame(mismatch, 799);
    expect(nearlyClosed.elapsedMs).toBe(359999999);
    expect(nearlyClosed.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: 1 });
    const closed = advanceGame(nearlyClosed, 1);
    expect(closed.elapsedMs).toBe(359999999);
    expect(closed.selection).toEqual({ kind: "closed" });
  });

  it("rejects invalid logical time", () => {
    const game = createGame("np1-4-1");
    expect(() => advanceGame(game, -1)).toThrow(RangeError);
    expect(() => advanceGame(game, Number.NaN)).toThrow(RangeError);
  });
});

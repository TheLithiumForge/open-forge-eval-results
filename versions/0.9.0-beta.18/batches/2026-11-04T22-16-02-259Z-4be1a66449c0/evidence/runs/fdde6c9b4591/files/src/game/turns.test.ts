import { describe, expect, it } from "vitest";
import { advanceGame, activateCard, createGame, isWon } from "./turns.ts";
import { decodeSnapshot } from "./snapshot.ts";

describe("card turns and active logical time", () => {
  it("reveals one card without a move and ignores selecting it twice", () => {
    const start = createGame("np1-4-1")!;
    const first = activateCard(start, 2);
    expect(first.selection).toEqual({ kind: "one", index: 2 });
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 2)).toBe(first);
  });

  it("matches immediately and caps moves while play continues", () => {
    const initial = createGame("np1-4-1")!;
    const match = activateCard(activateCard(initial, 2), 6);
    expect(match.matched).toEqual([2, 6]);
    expect(match.moves).toBe(1);

    const saved = decodeSnapshot(JSON.stringify({
      version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "one", index: 2 },
      moves: 999999, elapsedMs: 10, started: true,
    }))!;
    const capped = activateCard(saved, 6);
    expect(capped.moves).toBe(999999);
    expect(capped.matched).toEqual([2, 6]);
  });

  it("blocks turns during a mismatch and closes exactly at 800ms", () => {
    const start = createGame("np1-4-1")!;
    const miss = activateCard(activateCard(start, 0), 1);
    expect(miss.moves).toBe(1);
    expect(miss.selection).toMatchObject({ kind: "mismatch", remainingMs: 800 });
    expect(activateCard(miss, 2)).toBe(miss);
    const before = advanceGame(miss, 799);
    expect(before.selection).toMatchObject({ kind: "mismatch", remainingMs: 1 });
    expect(advanceGame(before, 1).selection).toEqual({ kind: "closed" });
    expect(advanceGame(miss, 800).elapsedMs).toBe(800);
  });

  it("stops elapsed time at its cap and stops entirely after victory", () => {
    const saved = decodeSnapshot(JSON.stringify({
      version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "one", index: 2 },
      moves: 0, elapsedMs: 359999994, started: true,
    }))!;
    expect(advanceGame(saved, 20).elapsedMs).toBe(359999999);
    const won = activateCard(activateCard(createGame("np1-4-1")!, 2), 6);
    const completed = { ...won, matched: won.board.deck.map((_, index) => index) };
    expect(isWon(completed)).toBe(true);
    expect(advanceGame(completed, 1000)).toBe(completed);
  });
});

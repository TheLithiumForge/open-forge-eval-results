import { describe, expect, it } from "vitest";
import { parseBoardCode } from "./boardCode.ts";
import { activateCard, advanceGame, createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, matchedPairCount } from "./state.ts";

const game = () => createGame("np1-4-1");

describe("game transitions", () => {
  it("reveals one card, ignores repeats, and counts only a second card", () => {
    const initial = game();
    expect(initial).not.toBeNull();
    if (initial === null) return;
    const one = activateCard(initial, 0);
    expect(one.selection).toEqual({ kind: "one", index: 0 });
    expect(activateCard(one, 0)).toBe(one);
    expect(activateCard(one, 16)).toBe(one);
    const match = activateCard(one, 11);
    expect(match.moves).toBe(1);
    expect(match.matched).toEqual([0, 11]);
    expect(matchedPairCount(match)).toBe(1);
    expect(initial.matched).toEqual([]);
  });

  it("keeps a mismatch for 800 active milliseconds and ignores turns", () => {
    const initial = game();
    expect(initial).not.toBeNull();
    if (initial === null) return;
    const mismatch = activateCard(activateCard(initial, 0), 1);
    expect(mismatch.selection.kind).toBe("mismatch");
    expect(activateCard(mismatch, 2)).toBe(mismatch);
    expect(advanceGame(mismatch, 799).selection.kind).toBe("mismatch");
    const elapsed = advanceGame(mismatch, 800);
    expect(elapsed.selection).toEqual({ kind: "closed" });
    expect(elapsed.elapsedMs).toBe(800);
  });

  it("starts the clock only on reveal, stops at win, and respects caps", () => {
    const initial = game();
    expect(initial).not.toBeNull();
    if (initial === null) return;
    expect(advanceGame(initial, 50).elapsedMs).toBe(0);
    const started = advanceGame(activateCard(initial, 0), 100.5);
    expect(started.elapsedMs).toBe(100.5);
    const nearCap = { ...started, elapsedMs: MAX_ELAPSED_MS - 2 };
    expect(advanceGame(nearCap, 50).elapsedMs).toBe(MAX_ELAPSED_MS);
    const nearMoveCap = { ...initial, started: true, moves: MAX_MOVES };
    expect(activateCard(activateCard(nearMoveCap, 0), 6).moves).toBe(MAX_MOVES);
    const board = parseBoardCode("np1-4-1");
    expect(board).not.toBeNull();
    if (board === null) return;
    const deck = initial.deck;
    let finished = initial;
    const firstByFace = new Map<number, number>();
    deck.forEach((face, index) => {
      const first = firstByFace.get(face);
      if (first === undefined) firstByFace.set(face, index);
      else {
        finished = activateCard(activateCard(finished, first), index);
      }
    });
    expect(isWon(finished)).toBe(true);
    expect(advanceGame(finished, 500).elapsedMs).toBe(finished.elapsedMs);
  });

  it("keeps deals and nested game data immutable", () => {
    const initial = game();
    expect(initial).not.toBeNull();
    if (initial === null) return;
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.deck)).toBe(true);
    expect(Object.isFrozen(initial.selection)).toBe(true);
  });
});

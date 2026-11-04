import { describe, expect, it } from "vitest";
import { activateCard, advanceGame, createGame, isWon } from "./state.ts";
import { BOARD_SIZES } from "./board.ts";
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_DURATION_MS, formatTime } from "./timing.ts";

describe("turn transitions and active time", () => {
  it("reveals one card without a move and ignores repeated or invalid activations", () => {
    const initial = createGame("np1-4-1");
    expect(initial).not.toBeNull();
    if (!initial) throw new Error("fixed board code must be valid");
    const one = activateCard(initial, 0);
    expect(one.selection).toEqual({ kind: "one", index: 0 });
    expect(one.started).toBe(true);
    expect(activateCard(one, 0)).toBe(one);
    expect(activateCard(one, 30)).toBe(one);
    expect(one.moves).toBe(0);
  });

  it("matches immediately and counts one move", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixed board code must be valid");
    const match = activateCard(activateCard(initial, 2), 6);
    expect(match.matched).toEqual([2, 6]);
    expect(match.moves).toBe(1);
    expect(isWon(match)).toBe(false);
  });

  it("blocks a mismatch until 800 active milliseconds pass", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixed board code must be valid");
    const miss = activateCard(activateCard(initial, 0), 1);
    expect(miss.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: MISMATCH_DURATION_MS });
    expect(activateCard(miss, 2)).toBe(miss);
    const before = advanceGame(miss, 799);
    expect(before.selection.kind).toBe("mismatch");
    expect(before.elapsedMs).toBe(799);
    const closed = advanceGame(before, 1);
    expect(closed.selection).toEqual({ kind: "closed" });
    expect(closed.elapsedMs).toBe(800);
  });

  it("stops time at the cap, allows the move cap, and formats long clocks", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixed board code must be valid");
    const atCap = Object.freeze({ ...initial, started: true, elapsedMs: MAX_ELAPSED_MS - 4 });
    expect(advanceGame(atCap, 20).elapsedMs).toBe(MAX_ELAPSED_MS);
    const movesAtCap = Object.freeze({ ...initial, moves: MAX_MOVES });
    const match = activateCard(activateCard(movesAtCap, 2), 6);
    expect(match.moves).toBe(MAX_MOVES);
    expect(match.matched).toEqual([2, 6]);
    expect(formatTime(3_600_000)).toBe("60:00");
  });

  it("resolves a pending mismatch even after elapsed time reaches its cap", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixed board code must be valid");
    const miss = activateCard(activateCard(initial, 0), 1);
    const nearCap = Object.freeze({ ...miss, elapsedMs: MAX_ELAPSED_MS });
    const stillWaiting = advanceGame(nearCap, 799);
    expect(stillWaiting.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(stillWaiting.selection.kind).toBe("mismatch");
    expect(advanceGame(stillWaiting, 1).selection).toEqual({ kind: "closed" });
  });

  it("completes all seven supported sizes with one move per pair", () => {
    for (const size of BOARD_SIZES) {
      const initial = createGame(`np1-${size}-1`);
      if (!initial) throw new Error("each supported board size must have a valid deal");
      let state = initial;
      const positions = new Map<number, number[]>();
      initial.board.deck.forEach((face, index) => {
        const pair = positions.get(face) ?? [];
        pair.push(index);
        positions.set(face, pair);
      });
      for (const pair of positions.values()) {
        expect(pair).toHaveLength(2);
        const first = pair[0];
        const second = pair[1];
        if (first === undefined || second === undefined) throw new Error("Every face must have two positions");
        state = activateCard(activateCard(state, first), second);
      }
      expect(isWon(state)).toBe(true);
      expect(state.moves).toBe(size * size / 2);
    }
  });
});

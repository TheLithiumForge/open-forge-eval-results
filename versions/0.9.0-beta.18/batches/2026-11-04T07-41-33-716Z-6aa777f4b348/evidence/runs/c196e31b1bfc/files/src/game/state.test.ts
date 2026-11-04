import { describe, expect, it } from "vitest";
import { BOARD_SIZES, parseBoardCode } from "./boardCode.ts";
import { activateCard, advanceGame, createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, type GameState } from "./state.ts";

describe("game transitions", () => {
  it("ignores a repeated selection and matches the second valid card", () => {
    const game = createGame("np1-4-1");
    if (game === null) throw new Error("known board code must load");
    const first = activateCard(game, 0);
    expect(activateCard(first, 0)).toBe(first);
    const match = activateCard(first, 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.moves).toBe(1);
    expect(match.selection).toEqual({ kind: "closed" });
    expect(match.started).toBe(true);
  });

  it("closes a miss at exactly 800ms and caps the clock", () => {
    const game = createGame("np1-4-1");
    if (game === null) throw new Error("known board code must load");
    const miss = activateCard(activateCard(game, 0), 1);
    expect(activateCard(miss, 2)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toMatchObject({ kind: "mismatch", remainingMs: 1 });
    expect(advanceGame(waiting, 1).selection).toEqual({ kind: "closed" });
    const capped = advanceGame({ ...waiting, selection: { kind: "closed" }, elapsedMs: MAX_ELAPSED_MS - 2 }, 4);
    expect(capped.elapsedMs).toBe(MAX_ELAPSED_MS);
  });

  it("caps moves and completes every supported board", () => {
    for (const size of BOARD_SIZES) {
      const board = parseBoardCode(`np1-${size}-9`);
      if (board === null) throw new Error("known board code must load");
      const initial = createGame(board.code);
      if (initial === null) throw new Error("known board code must load");
      let state: GameState = { ...initial, moves: MAX_MOVES };
      const positions = new Map<number, number[]>();
      board.deck.forEach((face, index) => positions.set(face, [...(positions.get(face) ?? []), index]));
      for (const pair of positions.values()) {
        const first = pair[0];
        const second = pair[1];
        if (first === undefined || second === undefined) throw new Error("every face has a pair");
        state = activateCard(activateCard(state, first), second);
      }
      expect(isWon(state)).toBe(true);
      expect(state.moves).toBe(MAX_MOVES);
      expect(state.matched).toHaveLength(size * size);
      expect(advanceGame(state, 100).elapsedMs).toBe(state.elapsedMs);
    }
  });
});

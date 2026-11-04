import { describe, expect, it } from "vitest";
import { MAX_ELAPSED_MS, MAX_MOVES, SELECTION_KIND } from "./constants.ts";
import { GRID_SIZES } from "./constants.ts";
import { createGame, activateCard, advanceGame, formatTime, isWon } from "./transition.ts";
import type { GameState } from "./state.ts";

function requiredGame(): GameState {
  const state = createGame("np1-4-1");
  if (!state) throw new Error("Expected valid test board");
  return state;
}

describe("game transitions", () => {
  it("reveals one card without a move and ignores repeats", () => {
    const state = requiredGame();
    expect(advanceGame(state, 100)).toBe(state);
    const first = activateCard(state, 0);
    expect(first.selection).toEqual({ kind: SELECTION_KIND.one, index: 0 });
    expect(first.moves).toBe(0);
    expect(first.started).toBe(true);
    expect(activateCard(first, 0)).toBe(first);
  });

  it("keeps matches and closes a miss after 800 active milliseconds", () => {
    const game = requiredGame();
    const match = activateCard(activateCard(game, 0), 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.moves).toBe(1);
    expect(isWon(match)).toBe(false);

    let miss = activateCard(activateCard(match, 1), 2);
    expect(miss.selection.kind).toBe(SELECTION_KIND.mismatch);
    expect(activateCard(miss, 3)).toBe(miss);
    miss = advanceGame(miss, 799.5);
    expect(miss.selection.kind).toBe(SELECTION_KIND.mismatch);
    expect(miss.elapsedMs).toBe(799.5);
    miss = advanceGame(miss, 0.5);
    expect(miss.selection).toEqual({ kind: SELECTION_KIND.closed });
    expect(miss.elapsedMs).toBe(800);
    expect(miss.moves).toBe(2);
  });

  it("keeps fractional time, caps moves and time, and formats long clocks", () => {
    const game = requiredGame();
    const partial = advanceGame(activateCard(game, 0), 12.25);
    expect(partial.elapsedMs).toBe(12.25);
    const first = game.deck.indexOf(0);
    const second = game.deck.lastIndexOf(0);
    const capped: GameState = {
      ...game,
      selection: { kind: SELECTION_KIND.one, index: first },
      moves: MAX_MOVES,
      started: true,
    };
    expect(activateCard(capped, second).moves).toBe(MAX_MOVES);
    expect(formatTime(3_600_000)).toBe("60:00");
    expect(formatTime(59_999)).toBe("0:59");

    const mismatch = activateCard(activateCard(game, 1), 2);
    const nearCap: GameState = { ...mismatch, elapsedMs: MAX_ELAPSED_MS - 10 };
    const cappedTime = advanceGame(nearCap, 800);
    expect(cappedTime.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(cappedTime.selection.kind).toBe(SELECTION_KIND.closed);
  });

  it("completes every supported board and stops time after its final pair", () => {
    for (const size of GRID_SIZES) {
      const game = createGame(`np1-${size}-123`);
      if (!game) throw new Error("Expected valid test board");
      const pairs = new Map<number, number[]>();
      game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
      let state = game;
      for (const pair of pairs.values()) state = activateCard(activateCard(state, pair[0] ?? -1), pair[1] ?? -1);
      expect(isWon(state)).toBe(true);
      expect(state.matched).toHaveLength(size * size);
      expect(state.moves).toBe(size * size / 2);
      expect(advanceGame(state, 1000)).toBe(state);
      expect(activateCard(state, 0)).toBe(state);
    }
  });
});

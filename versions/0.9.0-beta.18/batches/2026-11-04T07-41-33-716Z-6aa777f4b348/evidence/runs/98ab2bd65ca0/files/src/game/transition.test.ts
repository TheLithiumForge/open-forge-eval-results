import { describe, expect, it } from "vitest";
import { createGame } from "./create.ts";
import { advanceGame, formatElapsedTime } from "./clock.ts";
import { activateCard, MAX_MOVES } from "./transition.ts";
import { isWon } from "./state.ts";

function game() {
  const state = createGame("np1-4-1");
  if (state === null) throw new Error("Test board should be valid.");
  return state;
}

describe("card transitions", () => {
  it("formats elapsed minutes without wrapping after an hour", () => {
    expect(formatElapsedTime(3600000)).toBe("60:00");
    expect(formatElapsedTime(59999)).toBe("0:59");
  });

  it("ignores repeating the first card and counts only the second activation", () => {
    const initial = game();
    const first = activateCard(initial, 0);
    expect(activateCard(first, 0)).toBe(first);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 11).moves).toBe(1);
  });

  it("matches immediately and preserves the match after later turns", () => {
    const first = activateCard(game(), 0);
    const match = activateCard(first, 11);
    expect(match.matched).toEqual([0, 11]);
    expect(match.selection.kind).toBe("closed");
    expect(match.moves).toBe(1);
    expect(isWon(match)).toBe(false);
  });

  it("blocks mismatch activations and closes exactly at 800 active ms", () => {
    const first = activateCard(game(), 1);
    const miss = activateCard(first, 2);
    expect(miss.selection).toEqual({ kind: "mismatch", first: 1, second: 2, remainingMs: 800 });
    expect(activateCard(miss, 0)).toBe(miss);
    const waiting = advanceGame(miss, 799);
    expect(waiting.selection).toEqual({ kind: "mismatch", first: 1, second: 2, remainingMs: 1 });
    expect(advanceGame(waiting, 1).selection.kind).toBe("closed");
  });

  it("caps elapsed time and keeps it stopped after a win", () => {
    const nearCap = {
      ...activateCard(game(), 0),
      elapsedMs: 359999998,
    };
    const capped = advanceGame(nearCap, 10);
    expect(capped.elapsedMs).toBe(359999999);
    expect(advanceGame(capped, 10).elapsedMs).toBe(359999999);
  });

  it("keeps matching, mismatching, winning, and the clock working at the move cap", () => {
    let state = { ...activateCard(game(), 0), moves: MAX_MOVES };
    state = activateCard(state, 11);
    expect(state.matched).toEqual([0, 11]);
    expect(state.moves).toBe(MAX_MOVES);

    state = activateCard(state, 1);
    state = activateCard(state, 2);
    expect(state.selection.kind).toBe("mismatch");
    expect(state.moves).toBe(MAX_MOVES);
    state = advanceGame(state, 800);

    const waiting = new Map<number, number>();
    const matched = new Set(state.matched);
    for (let index = 0; index < state.board.deck.length; index += 1) {
      if (matched.has(index) || index === 1 || index === 2) continue;
      const face = state.board.deck[index];
      if (face === undefined) continue;
      const first = waiting.get(face);
      if (first === undefined) waiting.set(face, index);
      else {
        state = activateCard(activateCard(state, first), index);
        matched.add(first);
        matched.add(index);
      }
    }

    state = activateCard(state, 1);
    state = activateCard(state, 9);
    state = activateCard(state, 2);
    state = activateCard(state, 6);
    expect(state.moves).toBe(MAX_MOVES);
    expect(isWon(state)).toBe(true);
    expect(advanceGame(state, 100)).toBe(state);
  });
});

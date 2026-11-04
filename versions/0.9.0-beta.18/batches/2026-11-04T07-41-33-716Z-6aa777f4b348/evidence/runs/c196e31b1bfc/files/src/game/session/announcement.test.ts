import { describe, expect, it } from "vitest";
import { createGame, activateCard, type GameState } from "../state.ts";
import { turnAnnouncement } from "./announcement.ts";

function game(): GameState {
  const state = createGame("np1-4-1");
  if (state === null) throw new Error("known board code must load");
  return state;
}

describe("turn announcements", () => {
  it("describes match counts and misses once when the second card is revealed", () => {
    const start = game();
    const match = activateCard(activateCard(start, 0), 11);
    expect(turnAnnouncement(start, activateCard(start, 0))).toBeNull();
    expect(turnAnnouncement(activateCard(start, 0), match)).toBe("Pair found. 1 pair matched.");
    const mismatch = activateCard(activateCard(start, 0), 1);
    expect(turnAnnouncement(activateCard(start, 0), mismatch)).toBe("No match. Cards close after a short pause.");
    expect(turnAnnouncement(mismatch, mismatch)).toBeNull();
  });

  it("includes time and moves in the final match result", () => {
    let state = game();
    const positions = new Map<number, number[]>();
    state.deck.forEach((face, index) => positions.set(face, [...(positions.get(face) ?? []), index]));
    const pairs = [...positions.values()];
    for (const pair of pairs.slice(0, -1)) {
      const first = pair[0];
      const second = pair[1];
      if (first !== undefined && second !== undefined) state = activateCard(activateCard(state, first), second);
    }
    const finalPair = pairs.at(-1);
    const first = finalPair?.[0];
    const second = finalPair?.[1];
    if (first === undefined || second === undefined) throw new Error("last face has a pair");
    const before = activateCard(state, first);
    const won = activateCard(before, second);
    expect(turnAnnouncement(before, won)).toBe(`Pair found. All pairs found in ${won.moves} moves and 0:00.`);
  });
});

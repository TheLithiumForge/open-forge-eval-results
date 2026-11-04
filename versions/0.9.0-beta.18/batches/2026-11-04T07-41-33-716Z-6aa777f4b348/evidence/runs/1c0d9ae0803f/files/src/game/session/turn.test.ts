import { describe, expect, it } from "vitest";
import { activateCard, createGame } from "../state.ts";
import { MAX_MOVES } from "../timing.ts";
import { turnAnnouncement } from "./turn.ts";

describe("turn announcements at the move cap", () => {
  it("announces a match and a miss even when moves cannot increase", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixed board code must be valid");
    const matching = Object.freeze({ ...activateCard(initial, 2), moves: MAX_MOVES });
    expect(turnAnnouncement(matching, activateCard(matching, 6))).toBe("Pair found. 1 pair matched.");
    const selected = Object.freeze({ ...activateCard(initial, 0), moves: MAX_MOVES });
    expect(turnAnnouncement(selected, activateCard(selected, 1))).toBe("No match. Cards close after a short pause.");
  });

  it("includes the win when the final match happens at the cap", () => {
    const initial = createGame("np1-4-1");
    if (!initial) throw new Error("fixed board code must be valid");
    let state = initial;
    for (let face = 0; face < 8; face += 1) {
      if (face === initial.board.deck[2]) continue;
      const indices = initial.board.deck.flatMap((value, index) => value === face ? [index] : []);
      const first = indices[0];
      const second = indices[1];
      if (first === undefined || second === undefined) throw new Error("each face must have a pair");
      state = activateCard(activateCard(state, first), second);
    }
    const waiting = Object.freeze({ ...activateCard(state, 2), moves: MAX_MOVES });
    const won = activateCard(waiting, 6);
    expect(turnAnnouncement(waiting, won)).toMatch(/^Pair found\. All pairs found in 999999 moves and /);
  });
});

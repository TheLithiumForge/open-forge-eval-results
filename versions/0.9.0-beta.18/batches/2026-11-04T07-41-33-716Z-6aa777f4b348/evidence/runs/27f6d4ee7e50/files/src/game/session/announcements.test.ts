import { describe, expect, it } from "vitest";
import { turnAnnouncement } from "./announcements.ts";
import { activateCard, createGame } from "../state.ts";

describe("turn announcements", () => {
  it("reports a match, a miss, and the final win in one result", () => {
    const initial = createGame("np1-4-1");
    expect(initial).not.toBeNull();
    if (initial === null) return;
    const match = activateCard(activateCard(initial, 0), 11);
    expect(turnAnnouncement(activateCard(initial, 0), match)).toBe("Pair found. 1 pair matched.");
    const miss = activateCard(activateCard(initial, 0), 1);
    expect(turnAnnouncement(activateCard(initial, 0), miss)).toBe("No match. Cards close after a short pause.");

    const pairs = [[2, 6], [10, 14], [4, 5], [8, 15], [12, 13], [3, 7], [0, 11], [1, 9]] as const;
    let beforeFinal = initial;
    for (const [first, second] of pairs.slice(0, -1)) {
      beforeFinal = activateCard(activateCard(beforeFinal, first), second);
    }
    beforeFinal = activateCard(beforeFinal, 1);
    const final = activateCard(beforeFinal, 9);
    expect(turnAnnouncement(beforeFinal, final)).toBe("Pair found. All pairs found in 8 moves and 0:00.");
    expect(final.matched).toHaveLength(16);
  });
});

import { describe, expect, it } from "vitest";
import { bestForSize, initialBestScores, recordCompletedGame } from "./best.ts";
import type { SessionStorage } from "./storage.ts";

describe("per-size best scores in a session", () => {
  it("retains a new best after storage writes fail and across deal changes", () => {
    const unavailable: SessionStorage = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
    };
    const scores = initialBestScores(unavailable);
    const first = recordCompletedGame(scores, unavailable, 4, 8);
    const nextDeal = recordCompletedGame(first.scores, unavailable, 4, 12);
    const otherSize = recordCompletedGame(nextDeal.scores, unavailable, 6, 18);
    expect(bestForSize(otherSize.scores, 4)).toBe(8);
    expect(bestForSize(otherSize.scores, 6)).toBe(18);
  });
});

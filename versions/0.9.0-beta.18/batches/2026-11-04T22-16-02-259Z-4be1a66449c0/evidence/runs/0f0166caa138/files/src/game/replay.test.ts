import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.ts";

describe("replay files", () => {
  it("replays the documented equal-time example", () => {
    const state = replayGame(JSON.stringify({
      version: 1, boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }],
      endMs: 800,
    }));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });

  it("closes a miss before an action at the exact deadline", () => {
    const state = replayGame(JSON.stringify({
      version: 1, boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 }],
      endMs: 800,
    }));
    expect(state?.selection).toEqual({ kind: "one", index: 2 });
    expect(state?.moves).toBe(1);
  });

  it("rejects malformed timing, extra fields and oversized action lists", () => {
    const value = {
      version: 1, boardCode: "np1-4-1", actions: [{ atMs: 2, index: 0 }], endMs: 1,
    };
    expect(replayGame(JSON.stringify(value))).toBeNull();
    expect(replayGame(JSON.stringify({ ...value, extra: 1 }))).toBeNull();
    expect(replayGame(JSON.stringify({
      ...value, actions: Array.from({ length: 10_001 }, () => ({ atMs: 0, index: 0 })),
    }))).toBeNull();
  });
});

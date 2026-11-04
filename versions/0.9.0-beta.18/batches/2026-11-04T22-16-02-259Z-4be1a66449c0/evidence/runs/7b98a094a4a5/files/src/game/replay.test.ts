import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.js";

describe("replay format", () => {
  it("runs the documented equal-time match", () => {
    const replay = JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }],
      endMs: 800,
    });
    const result = replayGame(replay);
    expect(result?.matched).toEqual([0, 11]);
    expect(result?.moves).toBe(1);
    expect(result?.elapsedMs).toBe(800);
  });

  it("resolves a mismatch before an action at its exact deadline", () => {
    const result = replayGame(JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      actions: [
        { atMs: 0, index: 0 },
        { atMs: 0, index: 1 },
        { atMs: 800, index: 2 },
      ],
      endMs: 800,
    }));
    expect(result?.moves).toBe(1);
    expect(result?.selection).toEqual({ kind: "one", index: 2 });
    expect(result?.elapsedMs).toBe(800);
  });

  it("rejects unknown keys and invalid timelines", () => {
    const source = { version: 1, boardCode: "np1-4-1", actions: [], endMs: 0 };
    expect(replayGame(JSON.stringify({ ...source, extra: 1 }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...source, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], endMs: 2 }))).toBeNull();
    expect(replayGame("bad json")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.ts";

describe("version 1 replay", () => {
  it("replays the documented example", () => {
    const game = replayGame(JSON.stringify({
      version: 1, boardCode: "np1-4-1", actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
    }));
    expect(game).not.toBeNull();
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.moves).toBe(1);
    expect(game?.elapsedMs).toBe(800);
  });

  it("resolves a mismatch deadline before an equal-time action", () => {
    const atDeadline = replayGame(JSON.stringify({
      version: 1, boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 }], endMs: 800,
    }));
    expect(atDeadline?.selection).toEqual({ kind: "one", index: 2 });
    expect(atDeadline?.moves).toBe(1);

    const beforeDeadline = replayGame(JSON.stringify({
      version: 1, boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 }], endMs: 799,
    }));
    expect(beforeDeadline?.selection).toMatchObject({ kind: "mismatch", remainingMs: 1 });
  });

  it("rejects malformed replay shapes, times, indices and excessive actions", () => {
    const valid = { version: 1, boardCode: "np1-4-1", actions: [], endMs: 0 };
    expect(replayGame("no json")).toBeNull();
    expect(replayGame(JSON.stringify({ ...valid, extra: true }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...valid, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], endMs: 2 }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...valid, actions: [{ atMs: 0, index: 16 }] }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...valid, actions: Array.from({ length: 10_001 }, () => ({ atMs: 0, index: 0 })) }))).toBeNull();
  });
});

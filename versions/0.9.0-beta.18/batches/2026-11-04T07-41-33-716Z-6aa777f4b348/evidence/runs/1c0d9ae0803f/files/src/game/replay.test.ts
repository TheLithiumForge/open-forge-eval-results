import { describe, expect, it } from "vitest";
import { replayGame, MAX_REPLAY_ACTIONS, MAX_REPLAY_BYTES } from "./replay.ts";
import { MAX_ELAPSED_MS } from "./timing.ts";

function replay(actions: unknown[], endMs: number, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: 1, boardCode: "np1-4-1", actions, endMs, ...extra });
}

describe("version 1 replay", () => {
  it("replays the published equal-time matching example", () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 800));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });

  it("closes a mismatch before an action at its exact timeout", () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 1 },
      { atMs: 800, index: 2 }], 800));
    expect(state?.selection).toEqual({ kind: "one", index: 2 });
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });

  it("starts the elapsed clock at the first activation and applies the cap", () => {
    expect(replayGame(replay([{ atMs: 500, index: 0 }], 1_000))?.elapsedMs).toBe(500);
    expect(replayGame(replay([{ atMs: 0, index: 0 }], Number.MAX_SAFE_INTEGER))?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });

  it("rejects unknown keys, bad times, invalid codes, excess actions, and excess bytes", () => {
    for (const input of [replay([], 0, { debug: true }), replay([{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], 2),
      replay([{ atMs: 0, index: 16 }], 0), replay([{ atMs: -1, index: 0 }], 0),
      JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [], endMs: 0, extra: 1 }),
      JSON.stringify({ version: 1, boardCode: "np1-5-1", actions: [], endMs: 0 })]) {
      expect(replayGame(input)).toBeNull();
    }
    expect(replayGame(replay(Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })), 0))).toBeNull();
    expect(replayGame(" ".repeat(MAX_REPLAY_BYTES + 1))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.ts";
import { encodeSnapshot } from "./snapshot.ts";

function replay(actions: readonly unknown[], endMs: number): string {
  return JSON.stringify({ version: 1, boardCode: "np1-4-1", actions, endMs });
}

describe("version 1 replays", () => {
  it("replays the documented match and logical elapsed time", () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 800));
    expect(state).not.toBeNull();
    if (state === null) throw new Error("Expected valid replay");
    expect(state.matched).toEqual([0, 11]);
    expect(state.moves).toBe(1);
    expect(state.elapsedMs).toBe(800);
    expect(JSON.parse(encodeSnapshot(state))).toMatchObject({ version: 1, elapsedMs: 800, moves: 1 });
  });

  it("resolves a mismatch ending exactly at an action time", () => {
    const atBoundary = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 0 }
    ], 800));
    expect(atBoundary?.selection).toEqual({ kind: "one", index: 0 });
    expect(atBoundary?.moves).toBe(1);

    const beforeBoundary = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 }
    ], 799));
    expect(beforeBoundary?.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: 1 });
    expect(beforeBoundary?.moves).toBe(1);
  });

  it("keeps equal-time array order and lets invalid activations pass through game rules", () => {
    const state = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 0 }, { atMs: 0, index: 11 }
    ], 0));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(0);
  });

  it("rejects malformed replay shape, values, ordering and limits", () => {
    const invalid = [
      "{", JSON.stringify({ ...JSON.parse(replay([], 0)), extra: true }),
      JSON.stringify({ version: 2, boardCode: "np1-4-1", actions: [], endMs: 0 }),
      replay([{ atMs: 0, index: 0, extra: true }], 0),
      replay([{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }], 1),
      replay([{ atMs: 0, index: 16 }], 0),
      replay([{ atMs: Number.MAX_SAFE_INTEGER + 1, index: 0 }], Number.MAX_SAFE_INTEGER),
      replay([{ atMs: 2, index: 0 }], 1),
      JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: Array.from({ length: 10_001 }, () => ({ atMs: 0, index: 0 })), endMs: 0 })
    ];
    for (const text of invalid) expect(replayGame(text)).toBeNull();
  });

  it("counts UTF-8 bytes against the file limit", () => {
    const valid = JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [], endMs: 0 });
    const exactlyAtLimit = `${valid}${" ".repeat(1_048_576 - valid.length)}`;
    expect(new TextEncoder().encode(exactlyAtLimit).byteLength).toBe(1_048_576);
    expect(replayGame(exactlyAtLimit)).not.toBeNull();
    expect(replayGame(`${exactlyAtLimit} `)).toBeNull();

    const oversized = `{"label":"${"é".repeat(524_289)}"}`;
    expect(oversized.length).toBeLessThan(1_048_576);
    expect(new TextEncoder().encode(oversized).byteLength).toBeGreaterThan(1_048_576);
    expect(replayGame(oversized)).toBeNull();
  });
});

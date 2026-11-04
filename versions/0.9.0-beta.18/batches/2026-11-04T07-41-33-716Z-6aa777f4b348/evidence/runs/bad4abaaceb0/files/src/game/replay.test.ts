import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.ts";
import { encodeSnapshot } from "./snapshot.ts";
import { MAX_REPLAY_ACTIONS, MAX_REPLAY_BYTES } from "./constants.ts";

const example = {
  version: 1,
  boardCode: "np1-4-1",
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }],
  endMs: 800,
};

describe("replay format", () => {
  it("replays the documented match and logical elapsed time", () => {
    const state = replayGame(JSON.stringify(example));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
    expect(state && JSON.parse(encodeSnapshot(state)).started).toBe(true);
  });

  it("resolves an exact mismatch deadline before the equal-time action", () => {
    const input = JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 1 }, { atMs: 0, index: 2 }, { atMs: 800, index: 0 }],
      endMs: 800,
    });
    const state = replayGame(input);
    expect(state?.moves).toBe(1);
    expect(state?.selection).toEqual({ kind: "one", index: 0 });
    expect(state?.elapsedMs).toBe(800);
  });

  it("rejects malformed, noncanonical, unordered, oversized and unknown data", () => {
    expect(replayGame("{" )).toBeNull();
    expect(replayGame(JSON.stringify({ ...example, extra: true }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...example, boardCode: "np1-04-1" }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...example, boardCode: "np1-4-1\n" }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...example, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...example, actions: [{ atMs: 1, index: 0 }], endMs: 0 }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...example, actions: [{ atMs: 0, index: 16 }] }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...example, actions: Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) }))).toBeNull();
    expect(replayGame("x".repeat(MAX_REPLAY_BYTES + 1))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { replayGame, MAX_REPLAY_ACTIONS, MAX_REPLAY_BYTES } from "./replay.ts";

function replay(actions: readonly { atMs: number; index: number }[], endMs: number): string {
  return JSON.stringify({ version: 1, boardCode: "np1-4-1", actions, endMs });
}

describe("replayGame", () => {
  it("matches the documented replay vector", () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 800));
    expect(state).not.toBeNull();
    expect(state).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800 });
  });

  it("does not charge time before the first reveal and freezes on completion", () => {
    const beforeReveal = replayGame(replay([{ atMs: 5_000, index: 0 }], 8_000));
    expect(beforeReveal?.elapsedMs).toBe(3_000);
    const pairs = [[2, 6], [10, 14], [4, 5], [8, 15], [12, 13], [3, 7], [0, 11], [1, 9]] as const;
    const actions = pairs.flatMap((pair, pairIndex) => pair.map((index) => ({ atMs: pairIndex === 7 ? 1_000 : 0, index })));
    const done = replayGame(replay(actions, 3_000));
    expect(done?.elapsedMs).toBe(1_000);
  });

  it("closes a mismatch before an action at its exact deadline", () => {
    const state = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 },
    ], 800));
    expect(state).toMatchObject({ moves: 1, elapsedMs: 800, selection: { kind: "one", index: 2 } });
  });

  it.each([
    { version: 2, boardCode: "np1-4-1", actions: [], endMs: 0 },
    { version: 1, boardCode: "np1-04-1", actions: [], endMs: 0 },
    { version: 1, boardCode: "np1-4-1", actions: [{ atMs: 1, index: 0, extra: 1 }], endMs: 1 },
    { version: 1, boardCode: "np1-4-1", actions: [{ atMs: 0, index: 16 }], endMs: 0 },
    { version: 1, boardCode: "np1-4-1", actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], endMs: 2 },
    { version: 1, boardCode: "np1-4-1", actions: [{ atMs: 2, index: 0 }], endMs: 1 },
    { version: 1, boardCode: "np1-4-1", actions: [], endMs: -1 },
    { version: 1, boardCode: "np1-4-1", actions: [], endMs: 0, extra: true },
  ])("rejects invalid replay records", (value) => {
    expect(replayGame(JSON.stringify(value))).toBeNull();
  });

  it("rejects malformed, oversized and overlong replay input", () => {
    expect(replayGame("{" )).toBeNull();
    expect(replayGame(" ".repeat(MAX_REPLAY_BYTES + 1))).toBeNull();
    expect(replayGame(replay(Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })), 0))).toBeNull();
  });
});

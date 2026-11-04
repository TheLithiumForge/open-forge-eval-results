import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.ts";

function replay(actions: readonly { atMs: number; index: number }[], endMs: number, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: 1, boardCode: "np1-4-1", actions, endMs, ...extra });
}

describe("replay version 1", () => {
  it("matches the documented zero-time example and advances active time", () => {
    const game = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 800));
    expect(game).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800 });
  });

  it("closes a mismatch before an action at its exact deadline", () => {
    const game = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 },
    ], 800));
    expect(game).toMatchObject({ moves: 1, elapsedMs: 800, selection: { kind: "one", index: 2 } });
  });

  it("ignores actions during a miss and rejects malformed inputs", () => {
    const ignored = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 400, index: 2 },
    ], 800));
    expect(ignored).toMatchObject({ moves: 1, selection: { kind: "closed" } });
    for (const text of [
      replay([], 0, { extra: true }),
      replay([{ atMs: 3, index: 0 }, { atMs: 2, index: 1 }], 3),
      replay([{ atMs: 0, index: 16 }], 0),
      replay([{ atMs: 0, index: 0 }], 0, { boardCode: "np1-4-01" }),
      "not json",
    ]) expect(replayGame(text)).toBeNull();
  });
});

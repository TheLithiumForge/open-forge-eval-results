import { describe, expect, it } from "vitest";
import { replayGame } from "./replay";

describe("version 1 replay", () => {
  it("matches the documented replay example", () => {
    const result = replayGame(JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    expect(result).toMatchObject({ moves: 1, elapsedMs: 800, selection: { kind: "closed" } });
    expect([...result!.matched]).toEqual([0, 11]);
  });

  it("resolves an exact timeout before an equal-time action", () => {
    const result = replayGame(JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 },
    ], endMs: 800 }));
    expect(result).toMatchObject({ moves: 1, elapsedMs: 800, selection: { kind: "one", index: 2 } });
  });

  it("rejects extra keys, decreasing times, invalid indices and too many actions", () => {
    const base = { version: 1, boardCode: "np1-4-1", actions: [], endMs: 0 };
    expect(replayGame(JSON.stringify({ ...base, extra: 1 }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], endMs: 2 }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 0, index: 16 }], endMs: 0 }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: Array.from({ length: 10_001 }, (_, index) => ({ atMs: index, index: 0 })), endMs: 10_000 }))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.ts";

describe("version 1 replay", () => {
  it("matches the documented example result", () => {
    const replay = JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }],
      endMs: 800,
    });
    expect(replayGame(replay)).toMatchObject({
      matched: [0, 11],
      moves: 1,
      elapsedMs: 800,
    });
  });

  it("resolves the mismatch before an activation at the exact timeout", () => {
    const replay = JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      actions: [
        { atMs: 0, index: 1 },
        { atMs: 0, index: 2 },
        { atMs: 800, index: 0 },
      ],
      endMs: 800,
    });
    expect(replayGame(replay)?.selection).toEqual({ kind: "one", index: 0 });
  });

  it("uses safe replay time beyond the displayed clock cap to close mismatches", () => {
    const replay = JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      actions: [
        { atMs: 0, index: 1 },
        { atMs: 0, index: 2 },
        { atMs: Number.MAX_SAFE_INTEGER, index: 0 },
      ],
      endMs: Number.MAX_SAFE_INTEGER,
    });
    const result = replayGame(replay);
    expect(result?.elapsedMs).toBe(359999999);
    expect(result?.selection).toEqual({ kind: "one", index: 0 });
  });

  it("rejects unknown fields, bad action order and oversized inputs", () => {
    const base = { version: 1, boardCode: "np1-4-1", actions: [], endMs: 0 };
    expect(replayGame(JSON.stringify({ ...base, extra: true }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 0, index: 0, extra: true }] }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] }))).toBeNull();
    expect(replayGame(`${JSON.stringify(base)}${" ".repeat(1048576)}`)).toBeNull();
  });
});

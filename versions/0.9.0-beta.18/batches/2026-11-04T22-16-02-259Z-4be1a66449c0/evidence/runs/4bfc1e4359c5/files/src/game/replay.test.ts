import { describe, expect, it } from "vitest";
import { formatTime } from "./state.ts";
import { replayGame } from "./replay.ts";

describe("replays", () => {
  it("matches the documented replay", () => {
    const result = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    expect(result?.moves).toBe(1);
    expect(result?.matched).toEqual([0, 11]);
    expect(result?.elapsedMs).toBe(800);
  });

  it("closes an 800ms miss before an action at the same time", () => {
    const result = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":1},{"atMs":800,"index":2}],"endMs":800}');
    expect(result?.selection).toEqual({ kind: "one", index: 2 });
    expect(result?.moves).toBe(1);
    expect(result?.elapsedMs).toBe(800);
  });

  it("does not start elapsed time before the first valid reveal", () => {
    const result = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":500,"index":0}],"endMs":1500}');
    expect(result?.elapsedMs).toBe(1000);
    expect(formatTime(result?.elapsedMs ?? 0)).toBe("0:01");
  });

  it.each([
    '{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0,"extra":0}',
    '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":2,"index":0},{"atMs":1,"index":1}],"endMs":2}',
    '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":16}],"endMs":0}',
  ])("rejects invalid replay %s", (text) => expect(replayGame(text)).toBeNull());
});

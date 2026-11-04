import { describe, expect, it } from "vitest";
import { createGame } from "./state.ts";
import { decodeSnapshot, encodeSnapshot, MAX_SNAPSHOT_BYTES } from "./snapshot.ts";

function snapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: 1, boardCode: "np1-4-1", matched: [],
    selection: { kind: "closed" }, moves: 0, elapsedMs: 0, started: false, ...overrides });
}

describe("version 1 snapshots", () => {
  it("round trips a fresh game and keeps an imported unfinished state", () => {
    const game = createGame("np1-4-1");
    if (!game) throw new Error("fixed board code must be valid");
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    const restored = decodeSnapshot(snapshot({ selection: { kind: "one", index: 0 }, started: true }));
    expect(restored?.selection).toEqual({ kind: "one", index: 0 });
  });

  it("accepts complete matched pairs and a valid pending miss", () => {
    const pair = decodeSnapshot(snapshot({ matched: [2, 6], moves: 1, started: true }));
    expect(pair?.matched).toEqual([2, 6]);
    const miss = decodeSnapshot(snapshot({ selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 1 },
      moves: 1, started: true }));
    expect(miss?.selection.kind).toBe("mismatch");
  });

  it("rejects malformed fields, pairs, selections, counters, and versions", () => {
    for (const input of ["{", snapshot({ extra: true }), snapshot({ version: 2 }),
      snapshot({ matched: [2] }), snapshot({ matched: [2, 2] }), snapshot({ matched: [2, 6], moves: 0 }),
      snapshot({ selection: { kind: "mismatch", first: 0, second: 0, remainingMs: 1 }, moves: 1, started: true }),
      snapshot({ selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 801 }, moves: 1, started: true }),
      snapshot({ started: true }), snapshot({ elapsedMs: 359_999_999 + 1 }), snapshot({ moves: 1_000_000 })]) {
      expect(decodeSnapshot(input)).toBeNull();
    }
  });

  it("requires the full UTF-8 byte limit", () => {
    expect(decodeSnapshot(" ".repeat(MAX_SNAPSHOT_BYTES + 1))).toBeNull();
    expect(decodeSnapshot("é".repeat(MAX_SNAPSHOT_BYTES))).toBeNull();
  });
});

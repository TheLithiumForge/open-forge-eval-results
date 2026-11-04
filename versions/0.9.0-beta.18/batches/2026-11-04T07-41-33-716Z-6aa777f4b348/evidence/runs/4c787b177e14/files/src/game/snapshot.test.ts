import { describe, expect, it } from "vitest";
import { createGame } from "./board.ts";
import { SNAPSHOT_LIMIT_BYTES } from "./constants.ts";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";
import { activateCard } from "./transitions.ts";

describe("version 1 snapshots", () => {
  it("round-trips an active mismatch without adding derived fields", () => {
    const game = createGame("np1-4-1");
    if (!game) throw new Error("fixture board is valid");
    const state = activateCard(activateCard(activateCard(activateCard(game, 0), 11), 1), 2);
    const text = encodeSnapshot({ ...state, elapsedMs: 1500, selection: { kind: "mismatch", first: 1, second: 2, remainingMs: 300 } });
    expect(decodeSnapshot(text)).toMatchObject({ moves: 2, elapsedMs: 1500, selection: { kind: "mismatch", remainingMs: 300 } });
    expect(Object.keys(JSON.parse(text))).toEqual(["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"]);
  });

  it("rejects unknown keys, partial pairs, invalid moves, and oversized input", () => {
    const base = { version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "closed" }, moves: 0, elapsedMs: 0, started: false };
    for (const invalid of [
      { ...base, extra: true },
      { ...base, selection: { kind: "closed", extra: true } },
      { ...base, matched: [0] },
      { ...base, started: true },
      { ...base, version: 2 },
      { ...base, moves: -1 },
      { ...base, moves: 1 },
    ]) expect(decodeSnapshot(JSON.stringify(invalid))).toBeNull();
    expect(decodeSnapshot(" ".repeat(65_537))).toBeNull();
  });

  it("validates pair completeness, selection, integer fields, and UTF-8 size", () => {
    const base = { version: 1, boardCode: "np1-4-1", matched: [0, 11], selection: { kind: "closed" }, moves: 1, elapsedMs: 0, started: true };
    const pair = { version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "mismatch", first: 1, second: 9, remainingMs: 800 }, moves: 1, elapsedMs: 0, started: true };
    const complete = { ...base, matched: Array.from({ length: 16 }, (_, index) => index), selection: { kind: "one", index: 0 }, moves: 8 };
    for (const invalid of [
      { ...base, matched: [0, 11, 11] },
      { ...base, selection: { kind: "one", index: 0 } },
      pair,
      complete,
      { ...base, moves: 1.5 },
      { ...base, elapsedMs: Number.MAX_SAFE_INTEGER },
    ]) expect(decodeSnapshot(JSON.stringify(invalid))).toBeNull();
    const valid = JSON.stringify({ version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "closed" }, moves: 0, elapsedMs: 0, started: false });
    expect(valid.length).toBeLessThan(SNAPSHOT_LIMIT_BYTES);
    expect(decodeSnapshot(" ".repeat(SNAPSHOT_LIMIT_BYTES - valid.length) + valid)).not.toBeNull();
    expect(decodeSnapshot(`${valid}${"é".repeat(32_770)}`)).toBeNull();
  });
});

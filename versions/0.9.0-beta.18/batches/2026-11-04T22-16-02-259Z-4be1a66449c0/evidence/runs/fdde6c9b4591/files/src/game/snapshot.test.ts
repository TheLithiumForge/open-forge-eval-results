import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";
import { activateCard, createGame } from "./turns.ts";

describe("version 1 snapshots", () => {
  it("round trips a started game and a pending mismatch", () => {
    const mismatch = activateCard(activateCard(createGame("np1-4-1")!, 0), 1);
    if (mismatch.selection.kind !== "mismatch") throw new Error("Expected a mismatch fixture");
    const expected = { ...mismatch, selection: { ...mismatch.selection, remainingMs: 300 } };
    expect(decodeSnapshot(encodeSnapshot(expected))).toEqual(expected);
  });

  it("rejects malformed data, extra fields, partial pairs and invalid selection states", () => {
    const base = {
      version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "closed" },
      moves: 0, elapsedMs: 0, started: false,
    };
    for (const text of ["{", JSON.stringify({ ...base, extra: true }), JSON.stringify({ ...base, version: 2 })]) {
      expect(decodeSnapshot(text)).toBeNull();
    }
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [2] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, started: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, selection: { kind: "one", index: 2 } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, boardCode: "np1-4-1", selection: { kind: "mismatch", first: 0, second: 11, remainingMs: 0 }, started: true, moves: 1 }))).toBeNull();
  });

  it("rejects over-limit UTF-8 and noncanonical board codes", () => {
    expect(decodeSnapshot(" ".repeat(65_537))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ version: 1, boardCode: "np1-4-01", matched: [], selection: { kind: "closed" }, moves: 0, elapsedMs: 0, started: false }))).toBeNull();
  });
});

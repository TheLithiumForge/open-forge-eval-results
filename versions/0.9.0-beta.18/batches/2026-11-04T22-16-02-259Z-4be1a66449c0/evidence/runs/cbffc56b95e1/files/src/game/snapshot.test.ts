import { describe, expect, it } from "vitest";
import { activateCard, createGame } from "./game";
import { decodeSnapshot, encodeSnapshot } from "./snapshot";

describe("version 1 snapshots", () => {
  it("round trips a pending mismatch with whole milliseconds", () => {
    const mismatch = activateCard(activateCard(createGame("np1-4-1")!, 0), 1);
    const progressed = { ...mismatch, elapsedMs: 500, selection: { ...mismatch.selection, remainingMs: 300 } as const };
    const decoded = decodeSnapshot(encodeSnapshot(progressed));
    expect(decoded).toMatchObject({ moves: 1, elapsedMs: 500, selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 300 } });
  });

  it("rejects extra keys, partial pairs, and inconsistent move totals", () => {
    const base = { version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "closed" }, moves: 0, elapsedMs: 0, started: false };
    expect(decodeSnapshot(JSON.stringify({ ...base, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [2], started: true, moves: 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, started: true, moves: 0 }))).toBeNull();
  });

  it("rejects malformed JSON, unsupported versions and UTF-8 over the byte limit", () => {
    expect(decodeSnapshot("{" )).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ version: 2 }))).toBeNull();
    expect(decodeSnapshot(" ".repeat(65_537))).toBeNull();
  });
});

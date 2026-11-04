import { describe, expect, it } from "vitest";
import { createGame } from "./board.ts";
import { activateCard, advanceGame } from "./state.ts";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";

function validSnapshot() {
  return { version: 1, boardCode: "np1-4-1", matched: [2, 6], selection: { kind: "closed" },
    moves: 1, elapsedMs: 900, started: true };
}

describe("version 1 snapshots", () => {
  it("round trips progress, flooring elapsed and preserving timeout milliseconds", () => {
    let game = createGame("np1-4-1");
    game = activateCard(game, 0);
    game = advanceGame(game, 100.25);
    game = activateCard(game, 1);
    game = advanceGame(game, 798.5);
    const decoded = decodeSnapshot(encodeSnapshot(game));
    expect(decoded?.elapsedMs).toBe(898);
    expect(decoded?.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: 2 });

    const almostClosed = advanceGame(game, 0.75);
    const nearEnd = decodeSnapshot(encodeSnapshot(almostClosed));
    expect(nearEnd?.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: 1 });
  });

  it("accepts an unfinished mismatch and a completed closed board", () => {
    const mismatch = { ...validSnapshot(), matched: [], selection: { kind: "mismatch", first: 0,
      second: 1, remainingMs: 300 }, moves: 1 };
    expect(decodeSnapshot(JSON.stringify(mismatch))?.selection.kind).toBe("mismatch");
    const completed = { ...validSnapshot(), matched: Array.from({ length: 16 }, (_, index) => index), moves: 8 };
    expect(decodeSnapshot(JSON.stringify(completed))?.matched).toHaveLength(16);
  });

  it("rejects unknown keys and inconsistent selection, match, move and start data", () => {
    const invalid = [
      { ...validSnapshot(), extra: true },
      { ...validSnapshot(), selection: { kind: "closed", extra: 1 } },
      { ...validSnapshot(), matched: [2] },
      { ...validSnapshot(), matched: [2, 2] },
      { ...validSnapshot(), matched: [2, 6], moves: 0 },
      { ...validSnapshot(), selection: { kind: "mismatch", first: 0, second: 4, remainingMs: 300 }, moves: 1 },
      { ...validSnapshot(), selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 0 }, moves: 2 },
      { ...validSnapshot(), started: false },
      { ...validSnapshot(), moves: 1_000_000 },
      { ...validSnapshot(), elapsedMs: 359_999_999 + 1 },
      { ...validSnapshot(), selection: { kind: "closed" }, matched: Array.from({ length: 16 }, (_, index) => index) }
    ];
    for (const item of invalid) expect(decodeSnapshot(JSON.stringify(item))).toBeNull();
    expect(decodeSnapshot("{" )).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...validSnapshot(), version: 2 }))).toBeNull();
  });

  it("enforces the UTF-8 byte limit", () => {
    const valid = JSON.stringify(validSnapshot());
    const exactlyAtLimit = `${valid}${" ".repeat(65_536 - valid.length)}`;
    expect(new TextEncoder().encode(exactlyAtLimit).byteLength).toBe(65_536);
    expect(decodeSnapshot(exactlyAtLimit)).not.toBeNull();
    expect(decodeSnapshot(`${exactlyAtLimit} `)).toBeNull();

    const oversized = `{"extra":"${"é".repeat(32_769)}"}`;
    expect(oversized.length).toBeLessThan(65_536);
    expect(new TextEncoder().encode(oversized).byteLength).toBeGreaterThan(65_536);
    expect(decodeSnapshot(oversized)).toBeNull();
  });
});

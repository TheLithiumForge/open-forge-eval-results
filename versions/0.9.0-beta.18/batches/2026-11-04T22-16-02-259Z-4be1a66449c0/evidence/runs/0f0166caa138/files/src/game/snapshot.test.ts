import { describe, expect, it } from "vitest";
import { createGame } from "./boardCode.ts";
import { activateCard } from "./transitions.ts";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";

describe("snapshots", () => {
  it("round trips valid progress", () => {
    const game = createGame("np1-4-1");
    if (!game) throw new Error("fixture invalid");
    const state = activateCard(activateCard(game, 0), 1);
    const restored = decodeSnapshot(encodeSnapshot(state));
    expect(restored).toEqual(state);
  });

  it("rejects unknown keys, partial pairs and impossible selections", () => {
    const base = {
      version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "closed" },
      moves: 0, elapsedMs: 0, started: false,
    };
    expect(decodeSnapshot(JSON.stringify({ ...base, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [2] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({
      ...base, selection: { kind: "mismatch", first: 0, second: 11, remainingMs: 800 },
      moves: 1, started: true,
    }))).toBeNull();
  });

  it("enforces the UTF-8 byte limit and capped values", () => {
    const base = {
      version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "closed" },
      moves: 0, elapsedMs: 0, started: false,
    };
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: 1_000_000 }))).toBeNull();
    expect(decodeSnapshot(" ".repeat(65_537))).toBeNull();
  });
});

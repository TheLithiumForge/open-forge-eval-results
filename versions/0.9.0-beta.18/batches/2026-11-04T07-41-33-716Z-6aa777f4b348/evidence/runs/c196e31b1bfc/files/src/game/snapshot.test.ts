import { describe, expect, it } from "vitest";
import { activateCard, advanceGame, createGame } from "./state.ts";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";

function snapshot(overrides: Record<string, unknown> = {}): string {
  const value = {
    version: 1,
    boardCode: "np1-4-1",
    matched: [],
    selection: { kind: "closed" },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  };
  return JSON.stringify(value);
}

describe("snapshot version 1", () => {
  it("round trips a pending mismatch with its remaining active time", () => {
    const game = createGame("np1-4-1");
    if (game === null) throw new Error("known board code must load");
    const pending = advanceGame(activateCard(activateCard(game, 0), 1), 500);
    expect(decodeSnapshot(encodeSnapshot(pending))).toEqual(pending);
    expect(decodeSnapshot(encodeSnapshot(pending))?.selection).toMatchObject({ remainingMs: 300 });
  });

  it("rejects additional keys, half pairs, bad selections and untrimmed board codes", () => {
    const cases = [
      snapshot({ extra: true }),
      snapshot({ matched: [0] }),
      snapshot({ boardCode: " np1-4-1" }),
      snapshot({ selection: { kind: "closed", index: 0 } }),
      snapshot({ selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 0 }, moves: 1, started: true }),
      snapshot({ started: true, moves: 0 }),
      snapshot({ moves: 1, matched: [0, 15] }),
      snapshot({ version: 2 }),
    ];
    for (const value of cases) expect(decodeSnapshot(value)).toBeNull();
  });

  it("applies the UTF-8 byte limit", () => {
    expect(decodeSnapshot(`${" ".repeat(65_537)}${snapshot()}`)).toBeNull();
  });
});

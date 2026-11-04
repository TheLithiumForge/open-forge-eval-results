import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";
import { createGame, activateCard, advanceGame, isWon } from "./transition.ts";
import { SELECTION_KIND } from "./constants.ts";

function snapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 1,
    boardCode: "np1-4-1",
    matched: [0, 11],
    selection: { kind: "mismatch", first: 1, second: 2, remainingMs: 300 },
    moves: 2,
    elapsedMs: 1500,
    started: true,
    ...overrides,
  });
}

describe("snapshot format", () => {
  it("decodes the documented mismatch snapshot and round trips it", () => {
    const decoded = decodeSnapshot(snapshot());
    expect(decoded?.matched).toEqual([0, 11]);
    expect(decoded?.selection).toEqual({ kind: SELECTION_KIND.mismatch, first: 1, second: 2, remainingMs: 300 });
    expect(decoded && decodeSnapshot(encodeSnapshot(decoded))?.moves).toBe(2);
  });

  it("rejects unknown keys, incomplete pairs, bad selection and inconsistent counts", () => {
    expect(decodeSnapshot(snapshot({ extra: true }))).toBeNull();
    expect(decodeSnapshot(snapshot({ boardCode: "np1-4-1\n" }))).toBeNull();
    expect(decodeSnapshot(snapshot({ matched: [0] }))).toBeNull();
    expect(decodeSnapshot(snapshot({ selection: { kind: "one", index: 0 } }))).toBeNull();
    expect(decodeSnapshot(snapshot({ moves: 0 }))).toBeNull();
    expect(decodeSnapshot(snapshot({ selection: { kind: "mismatch", first: 1, second: 2, remainingMs: 0 } }))).toBeNull();
    expect(decodeSnapshot(snapshot({ selection: { kind: "mismatch", first: 1, second: 1, remainingMs: 1 } }))).toBeNull();
    expect(decodeSnapshot(snapshot({ selection: { kind: "closed", extra: 1 } }))).toBeNull();
    expect(decodeSnapshot(snapshot({ moves: 1.5 }))).toBeNull();
    expect(decodeSnapshot(snapshot({ moves: Number.MAX_SAFE_INTEGER + 1 }))).toBeNull();
    expect(decodeSnapshot(snapshot({ elapsedMs: 359_999_999 + 1 }))).toBeNull();
    expect(decodeSnapshot(snapshot({ started: true, moves: 0, matched: [], selection: { kind: "closed" } }))).toBeNull();
  });

  it("validates new, one-card and completed states and enforces UTF-8 bytes", () => {
    const game = createGame("np1-4-1");
    expect(game && decodeSnapshot(encodeSnapshot(game))?.started).toBe(false);
    const one = game && activateCard(game, 0);
    expect(one && decodeSnapshot(encodeSnapshot(one))?.selection.kind).toBe(SELECTION_KIND.one);
    expect(decodeSnapshot("😀".repeat(16_385))).toBeNull();
    expect(decodeSnapshot(snapshot({ started: false }))).toBeNull();
  });

  it("exports elapsed and mismatch times as whole milliseconds", () => {
    const state = createGame("np1-4-1");
    const first = state && activateCard(state, 1);
    const second = first && activateCard(first, 2);
    const partial = second && { ...second, elapsedMs: 1500.9, selection: { kind: SELECTION_KIND.mismatch, first: 1, second: 2, remainingMs: 0.4 } };
    const encoded = partial && encodeSnapshot(partial);
    expect(encoded).toContain('"elapsedMs": 1500');
    expect(encoded).toContain('"remainingMs": 1');
  });

  it("accepts completed progress and keeps the clock stopped", () => {
    const game = createGame("np1-4-1");
    if (!game) throw new Error("Expected valid test board");
    const pairs = new Map<number, number[]>();
    game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
    let complete = game;
    for (const pair of pairs.values()) complete = activateCard(activateCard(complete, pair[0] ?? -1), pair[1] ?? -1);
    expect(isWon(complete)).toBe(true);
    expect(decodeSnapshot(encodeSnapshot(complete))?.matched).toHaveLength(16);
    expect(advanceGame(complete, 10_000)).toBe(complete);
  });
});

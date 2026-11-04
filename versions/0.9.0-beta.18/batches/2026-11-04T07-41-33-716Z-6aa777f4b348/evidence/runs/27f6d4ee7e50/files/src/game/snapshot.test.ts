import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot, MAX_SNAPSHOT_BYTES } from "./snapshot.ts";
import { activateCard, createGame } from "./state.ts";

const base = {
  version: 1,
  boardCode: "np1-4-1",
  matched: [],
  selection: { kind: "closed" },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

function text(value: unknown): string {
  return JSON.stringify(value);
}

function finishDeal() {
  const initial = createGame("np1-4-1");
  if (initial === null) throw new Error("known board code rejected");
  let state = initial;
  const firstByFace = new Map<number, number>();
  initial.deck.forEach((face, index) => {
    const first = firstByFace.get(face);
    if (first === undefined) firstByFace.set(face, index);
    else state = activateCard(activateCard(state, first), index);
  });
  return state;
}

describe("snapshot format", () => {
  it("round trips new, started, mismatch and completed positions", () => {
    const initial = createGame("np1-4-1");
    expect(initial).not.toBeNull();
    if (initial === null) return;
    const states = [initial, activateCard(initial, 0), activateCard(activateCard(initial, 0), 1), finishDeal()];
    for (const state of states) expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  });

  it("rounds a fractional pending timer up to at least one whole millisecond", () => {
    const initial = createGame("np1-4-1");
    expect(initial).not.toBeNull();
    if (initial === null) return;
    const mismatch = activateCard(activateCard(initial, 0), 1);
    const fractional = { ...mismatch, selection: { kind: "mismatch" as const, first: 0, second: 1, remainingMs: 0.2 } };
    const restored = decodeSnapshot(encodeSnapshot(fractional));
    expect(restored?.selection).toMatchObject({ kind: "mismatch", remainingMs: 1 });
  });

  it.each([
    { ...base, extra: true },
    { ...base, version: 2 },
    { ...base, boardCode: " np1-4-1" },
    { ...base, moves: -1 },
    { ...base, moves: 1_000_000 },
    { ...base, elapsedMs: 359_999_360 },
    { ...base, started: true },
    { ...base, matched: [0] },
    { ...base, started: true, selection: { kind: "one", index: 16 } },
    { ...base, selection: { kind: "closed", extra: 1 } },
    { ...base, started: true, moves: 1, selection: { kind: "mismatch", first: 0, second: 11, remainingMs: 800 } },
    { ...base, started: true, moves: 1, selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 0 } },
  ])("rejects inconsistent or unknown snapshot data", (value) => {
    expect(decodeSnapshot(text(value))).toBeNull();
  });

  it("rejects malformed and oversized UTF-8 input", () => {
    expect(decodeSnapshot("{" )).toBeNull();
    expect(decodeSnapshot(" ".repeat(MAX_SNAPSHOT_BYTES + 1))).toBeNull();
  });
});

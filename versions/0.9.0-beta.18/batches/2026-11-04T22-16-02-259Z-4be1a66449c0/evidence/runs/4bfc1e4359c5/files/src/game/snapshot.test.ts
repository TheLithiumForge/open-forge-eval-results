import { describe, expect, it } from "vitest";
import { createGame } from "./state.ts";
import { activateCard, advanceGame } from "./transitions.ts";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";

describe("snapshots", () => {
  it("round trips a pending mismatch with its active remaining time", () => {
    const miss = activateCard(activateCard(createGame("np1-4-1")!, 0), 1);
    const state = advanceGame(miss, 500);
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    expect(decodeSnapshot(encodeSnapshot(state))?.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: 300 });
  });

  it("accepts the documented snapshot and derives its board", () => {
    const text = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
    expect(decodeSnapshot(text)?.matched).toEqual([0, 11]);
  });

  it.each([
    '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"closed"},"moves":0,"elapsedMs":0,"started":false,"extra":1}',
    '{"version":1,"boardCode":"np1-4-1","matched":[0],"selection":{"kind":"closed"},"moves":1,"elapsedMs":0,"started":true}',
    '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"mismatch","first":0,"second":1,"remainingMs":801},"moves":1,"elapsedMs":0,"started":true}',
    '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"closed"},"moves":0,"elapsedMs":0,"started":true}',
  ])("rejects inconsistent snapshot %s", (text) => expect(decodeSnapshot(text)).toBeNull());

  it("rejects invalid and oversized UTF-8 JSON", () => {
    expect(decodeSnapshot("not json")).toBeNull();
    expect(decodeSnapshot(" ".repeat(65_537))).toBeNull();
    expect(decodeSnapshot("é".repeat(32_769))).toBeNull();
  });
});

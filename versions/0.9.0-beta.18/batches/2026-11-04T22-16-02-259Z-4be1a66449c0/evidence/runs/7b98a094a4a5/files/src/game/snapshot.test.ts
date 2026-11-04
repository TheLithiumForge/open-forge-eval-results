import { describe, expect, it } from "vitest";
import { createGame } from "./state.js";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.js";
import { activateCard } from "./turns.js";

const EXAMPLE =
  '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';

describe("snapshot format", () => {
  it("round-trips a game state", () => {
    const initial = createGame("np1-4-1");
    if (initial === null) throw new Error("Test board is invalid.");
    const revealed = activateCard(activateCard(initial, 0), 1);
    const restored = decodeSnapshot(encodeSnapshot(revealed));
    expect(restored).toEqual(revealed);
  });

  it("loads the documented mismatch snapshot", () => {
    const restored = decodeSnapshot(EXAMPLE);
    expect(restored?.matched).toEqual([0, 11]);
    expect(restored?.selection).toMatchObject({ kind: "mismatch", remainingMs: 300 });
  });

  it("rejects inconsistent and extra data", () => {
    expect(decodeSnapshot(EXAMPLE.replace('"started":true}', '"started":true,"extra":true}'))).toBeNull();
    expect(decodeSnapshot(EXAMPLE.replace('"matched":[0,11]', '"matched":[0]'))).toBeNull();
    expect(decodeSnapshot(EXAMPLE.replace('"moves":2', '"moves":0'))).toBeNull();
    expect(decodeSnapshot("{" )).toBeNull();
  });

  it("enforces the UTF-8 size limit and move range", () => {
    expect(decodeSnapshot(" ".repeat(65_537))).toBeNull();
    expect(decodeSnapshot(EXAMPLE.replace('"moves":2', '"moves":1000000'))).toBeNull();
  });
});

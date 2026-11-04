import { describe, expect, it } from "vitest";
import { replayGame } from "./replay.ts";
import { REPLAY_LIMIT_BYTES, REPLAY_LIMIT_ACTIONS } from "./constants.ts";

describe("logical replay", () => {
  it("plays the documented equal-time match and emits the expected progress", () => {
    const state = replayGame(JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    expect(state).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, started: true });
  });

  it("closes a mismatch at its exact deadline before the next action", () => {
    const state = replayGame(JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 3 }, { atMs: 800, index: 6 }], endMs: 800 }));
    expect(state).toMatchObject({ selection: { kind: "one", index: 6 }, moves: 1, elapsedMs: 800 });
  });

  it("rejects extra fields, unordered times, bad indices, and oversized replays", () => {
    const base = { version: 1, boardCode: "np1-4-1", actions: [], endMs: 0 };
    for (const invalid of [
      { ...base, extra: 1 },
      { ...base, actions: [{ atMs: -1, index: 0 }], endMs: 0 },
      { ...base, actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }], endMs: 1 },
      { ...base, actions: [{ atMs: 0, index: 16 }], endMs: 0 },
    ]) expect(replayGame(JSON.stringify(invalid))).toBeNull();
    expect(replayGame(" ".repeat(1_048_577))).toBeNull();
  });

  it("caps long logical time and validates action and byte limits", () => {
    const hugeTime = replayGame(JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [{ atMs: 0, index: 0 }], endMs: Number.MAX_SAFE_INTEGER }));
    expect(hugeTime?.elapsedMs).toBe(359_999_999);
    const tooMany = Array.from({ length: REPLAY_LIMIT_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 }));
    expect(replayGame(JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: tooMany, endMs: 0 }))).toBeNull();
    const valid = JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [], endMs: 0 });
    expect(replayGame(" ".repeat(REPLAY_LIMIT_BYTES - valid.length) + valid)).not.toBeNull();
  });
});

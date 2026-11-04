import { describe, expect, it } from "vitest";
import {
  BEST_SCORES_KEY,
  PREFERENCES_KEY,
  readBestScore,
  readGridSize,
  saveBestScore,
  writeGridSize,
  type SessionStorage,
} from "./storage.ts";

function memoryStorage(entries: Record<string, string> = {}): SessionStorage {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("session storage", () => {
  it("validates preferences and ignores malformed saved data", () => {
    const storage = memoryStorage({
      [PREFERENCES_KEY]: JSON.stringify({ version: 1, size: 16 }),
      unrelated: "keep",
    });
    expect(readGridSize(storage)).toBe(16);
    writeGridSize(storage, 8);
    expect(readGridSize(storage)).toBe(8);
    expect(storage.getItem("unrelated")).toBe("keep");
    expect(readGridSize(memoryStorage({ [PREFERENCES_KEY]: "not json" }))).toBeNull();
    expect(readGridSize(memoryStorage({ [PREFERENCES_KEY]: '{"version":1,"size":5}' }))).toBeNull();
  });

  it("keeps only supported safe best scores and replaces only a better result", () => {
    const storage = memoryStorage({
      [BEST_SCORES_KEY]: JSON.stringify({ version: 1, scores: { 4: 12, 6: -1, 8: 1.5, 10: 1_000_000 } }),
    });
    expect(readBestScore(storage, 4)).toBe(12);
    expect(readBestScore(storage, 6)).toBeNull();
    expect(saveBestScore(storage, 4, 12)).toBe(12);
    expect(saveBestScore(storage, 4, 8)).toBe(8);
    expect(readBestScore(storage, 4)).toBe(8);
  });

  it("ignores storage read and write failures", () => {
    const unavailable: SessionStorage = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
    };
    expect(readGridSize(unavailable)).toBeNull();
    expect(readBestScore(unavailable, 4)).toBeNull();
    expect(() => writeGridSize(unavailable, 4)).not.toThrow();
    expect(saveBestScore(unavailable, 4, 3)).toBeNull();
  });
});

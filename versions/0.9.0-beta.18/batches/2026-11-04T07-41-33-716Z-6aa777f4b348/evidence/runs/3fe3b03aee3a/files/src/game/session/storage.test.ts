import { describe, expect, it } from "vitest";
import { PREFERENCES_KEY, readPreferences, writePreferences } from "./storage.ts";

function memoryStorage(seed: Readonly<Record<string, string>> = {}) {
  const values = new Map(Object.entries(seed));
  const writes: string[] = [];
  return {
    values,
    writes,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key);
      values.set(key, value);
    }
  };
}

describe("session preferences", () => {
  it("uses defaults for missing, malformed or unrecognized saved settings", () => {
    expect(readPreferences(null)).toEqual({ size: 4, bestScores: {} });
    expect(readPreferences(memoryStorage({ [PREFERENCES_KEY]: "{" }))).toEqual({ size: 4, bestScores: {} });
    const saved = memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({
      size: 5,
      bestScores: { 4: 0, 6: 999_999, 8: -1, 10: 1.5, 12: 1_000_000, 18: 2 }
    }) });
    expect(readPreferences(saved)).toEqual({ size: 4, bestScores: { 4: 0, 6: 999_999 } });
  });

  it("catches storage failures and writes only the game preference key", () => {
    const failed = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); }
    };
    expect(readPreferences(failed)).toEqual({ size: 4, bestScores: {} });
    expect(() => writePreferences({ size: 8, bestScores: { 8: 11 } }, failed)).not.toThrow();

    const saved = memoryStorage({ other: "untouched" });
    writePreferences({ size: 8, bestScores: { 8: 11 } }, saved);
    expect(saved.writes).toEqual([PREFERENCES_KEY]);
    expect(saved.values.get("other")).toBe("untouched");
    expect(readPreferences(saved)).toEqual({ size: 8, bestScores: { 8: 11 } });
  });
});

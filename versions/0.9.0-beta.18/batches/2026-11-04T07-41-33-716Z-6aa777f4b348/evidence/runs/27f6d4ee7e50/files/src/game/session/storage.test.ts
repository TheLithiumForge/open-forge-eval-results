import { describe, expect, it } from "vitest";
import { PREFERENCES_KEY, readPreferences, writePreferences } from "./storage.ts";
import type { StoragePort } from "./storage.ts";

function memoryStorage(initial: Readonly<Record<string, string>> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: StoragePort = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  return { storage, values };
}

describe("saved preferences", () => {
  it("uses defaults when settings are missing, malformed, or storage fails", () => {
    expect(readPreferences(() => memoryStorage().storage)).toEqual({ size: 4, bestMoves: {} });
    expect(readPreferences(() => ({ getItem: () => "{", setItem: () => undefined })))
      .toEqual({ size: 4, bestMoves: {} });
    expect(readPreferences(() => { throw new Error("blocked"); })).toEqual({ size: 4, bestMoves: {} });
  });

  it("validates sizes and scores independently and drops unsupported entries", () => {
    const storage = memoryStorage({
      [PREFERENCES_KEY]: JSON.stringify({ version: 1, size: 5, bestMoves: {
        4: 0, 6: 999_999, 8: -1, 10: 1.5, 12: 1_000_000, 14: "8", 16: 24, 5: 2,
      } }),
    });
    expect(readPreferences(() => storage.storage)).toEqual({
      size: 4,
      bestMoves: { 4: 0, 6: 999_999, 16: 24 },
    });
  });

  it("writes only its own key and tolerates blocked writes", () => {
    const storage = memoryStorage({ unrelated: "keep" });
    writePreferences({ size: 8, bestMoves: { 4: 7 } }, () => storage.storage);
    expect(storage.values.get("unrelated")).toBe("keep");
    expect(readPreferences(() => storage.storage)).toEqual({ size: 8, bestMoves: { 4: 7 } });
    expect(() => writePreferences({ size: 4, bestMoves: {} }, () => {
      throw new Error("blocked");
    })).not.toThrow();
  });
});

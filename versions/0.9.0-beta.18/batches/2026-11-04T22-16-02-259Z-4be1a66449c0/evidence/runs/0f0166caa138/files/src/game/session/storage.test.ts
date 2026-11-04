import { describe, expect, it } from "vitest";
import {
  BEST_SCORES_KEY, PREFERENCES_KEY, readBestScores, readSavedSize, recordBest, type StorageLike,
} from "./storage.ts";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("saved preferences and best scores", () => {
  it("ignores invalid stored values and leaves unrelated keys alone", () => {
    const storage = new MemoryStorage();
    storage.values.set(PREFERENCES_KEY, JSON.stringify({ size: 5 }));
    storage.values.set(BEST_SCORES_KEY, JSON.stringify({ "4": 10, "6": 1_000_000 }));
    storage.values.set("other", "preserve");
    expect(readSavedSize(storage)).toBe(4);
    expect(readBestScores(storage)).toEqual({ 4: 10 });
    expect(storage.values.get("other")).toBe("preserve");
  });

  it("keeps only a better score for the selected size", () => {
    const storage = new MemoryStorage();
    const first = recordBest({}, 4, 12, storage);
    const equal = recordBest(first, 4, 12, storage);
    const better = recordBest(equal, 4, 9, storage);
    expect(better[4]).toBe(9);
    expect(JSON.parse(storage.getItem(BEST_SCORES_KEY) ?? "{}")).toEqual({ "4": 9 });
  });

  it("continues when storage throws", () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error("unavailable"); },
      setItem: () => { throw new Error("unavailable"); },
    };
    expect(readSavedSize(broken)).toBe(4);
    expect(readBestScores(broken)).toEqual({});
    expect(recordBest({}, 6, 8, broken)[6]).toBe(8);
  });
});

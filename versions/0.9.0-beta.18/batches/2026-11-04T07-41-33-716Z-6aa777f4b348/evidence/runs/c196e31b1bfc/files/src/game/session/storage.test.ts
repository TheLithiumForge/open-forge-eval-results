import { describe, expect, it } from "vitest";
import { readBestScores, readPreferredSize, saveBestScores, savePreferredSize, type SessionStorage } from "./storage.ts";

class MemoryStorage implements SessionStorage {
  readonly items = new Map<string, string>();
  fail = false;

  getItem(key: string): string | null {
    if (this.fail) throw new Error("storage unavailable");
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.fail) throw new Error("storage unavailable");
    this.items.set(key, value);
  }
}

describe("session storage", () => {
  it("uses no preference for missing or invalid saved sizes", () => {
    const storage = new MemoryStorage();
    expect(readPreferredSize(storage)).toBeNull();
    storage.items.set("neon-pairs.preferences.v1", "{bad json");
    expect(readPreferredSize(storage)).toBeNull();
    storage.items.set("neon-pairs.preferences.v1", JSON.stringify({ size: 5 }));
    expect(readPreferredSize(storage)).toBeNull();
    storage.items.set("neon-pairs.preferences.v1", JSON.stringify({ size: 16 }));
    expect(readPreferredSize(storage)).toBe(16);
  });

  it("validates best moves and saves only game records", () => {
    const storage = new MemoryStorage();
    storage.items.set("other", "keep me");
    storage.items.set("neon-pairs.best.v1", JSON.stringify({ "4": 12, "6": 1_000_000, "8": 2.5, "10": "3", "18": 1 }));
    expect(readBestScores(storage)).toEqual({ 4: 12 });
    savePreferredSize(storage, 6);
    saveBestScores(storage, { 4: 12, 6: 0, 8: 1_000_000 });
    expect(storage.items.get("other")).toBe("keep me");
    expect(storage.items.get("neon-pairs.preferences.v1")).toBe('{"size":6}');
    expect(storage.items.get("neon-pairs.best.v1")).toBe('{"4":12,"6":0}');
  });

  it("continues with empty values when storage reads and writes throw", () => {
    const storage = new MemoryStorage();
    storage.fail = true;
    expect(readPreferredSize(storage)).toBeNull();
    expect(readBestScores(storage)).toEqual({});
    expect(() => savePreferredSize(storage, 4)).not.toThrow();
    expect(() => saveBestScores(storage, { 4: 1 })).not.toThrow();
  });
});

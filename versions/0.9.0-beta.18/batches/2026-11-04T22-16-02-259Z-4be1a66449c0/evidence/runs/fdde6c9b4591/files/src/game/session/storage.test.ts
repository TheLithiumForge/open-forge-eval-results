import { afterEach, describe, expect, it, vi } from "vitest";
import { readBestScores, readPreferredSize, saveBestScores, savePreferredSize } from "./storage.ts";

function useMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
  vi.stubGlobal("window", { localStorage });
  return { values, localStorage };
}

afterEach(() => vi.unstubAllGlobals());

describe("browser storage", () => {
  it("validates sizes and finite capped best scores", () => {
    const { values } = useMemoryStorage({
      "neon-pairs.preferences": JSON.stringify({ gridSize: 16 }),
      "neon-pairs.best-scores": JSON.stringify({ 4: 12, 6: 1.5, 8: -1, 10: 1_000_000, 12: 0, extra: 2 }),
    });
    expect(readPreferredSize()).toBe(16);
    expect(readBestScores()).toEqual({ 4: 12, 12: 0 });
    savePreferredSize(8);
    saveBestScores({ 4: 7 });
    expect(values.get("neon-pairs.preferences")).toBe('{"gridSize":8}');
    expect(values.has("unrelated")).toBe(false);
  });

  it("ignores invalid saved JSON and survives blocked reads and writes", () => {
    useMemoryStorage({ "neon-pairs.preferences": "{", "neon-pairs.best-scores": "null" });
    expect(readPreferredSize()).toBe(4);
    expect(readBestScores()).toEqual({});
    vi.stubGlobal("window", { get localStorage() { throw new Error("storage blocked"); } });
    expect(readPreferredSize()).toBe(4);
    expect(readBestScores()).toEqual({});
    expect(() => savePreferredSize(6)).not.toThrow();
    expect(() => saveBestScores({ 6: 8 })).not.toThrow();
  });
});

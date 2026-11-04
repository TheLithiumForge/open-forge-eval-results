import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CLI = fileURLToPath(new URL("./replay.ts", import.meta.url));

describe("replay command", () => {
  it("writes only the final snapshot for a valid replay", async () => {
    const folder = await mkdtemp(join(tmpdir(), "neon-pairs-replay-"));
    try {
      const replayPath = join(folder, "play.json");
      await writeFile(replayPath, JSON.stringify({
        version: 1,
        boardCode: "np1-4-1",
        actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }],
        endMs: 800,
      }));
      const result = spawnSync(process.execPath, [CLI, replayPath], { encoding: "utf8" });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const snapshot: unknown = JSON.parse(result.stdout);
      expect(snapshot).toMatchObject({ boardCode: "np1-4-1", matched: [0, 11], moves: 1, elapsedMs: 800 });
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });

  it("writes no stdout and fails for invalid input", async () => {
    const folder = await mkdtemp(join(tmpdir(), "neon-pairs-replay-"));
    try {
      const replayPath = join(folder, "invalid.json");
      await writeFile(replayPath, "{\n");
      const result = spawnSync(process.execPath, [CLI, replayPath], { encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toMatch(/Invalid replay|JSON|replay/i);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});

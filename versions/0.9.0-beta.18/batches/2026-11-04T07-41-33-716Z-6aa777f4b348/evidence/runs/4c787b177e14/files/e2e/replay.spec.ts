import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test("the documented replay command prints only a final snapshot or an error", async () => {
  const directory = await mkdtemp(join(tmpdir(), "neon-pairs-replay-"));
  const validFile = join(directory, "valid.json");
  const invalidFile = join(directory, "invalid.json");
  const oversizedFile = join(directory, "oversized.json");
  const missingFile = join(directory, "missing.json");
  try {
    const example = JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }],
      endMs: 800,
    });
    await writeFile(validFile, example, "utf8");
    await writeFile(invalidFile, JSON.stringify({ version: 1, boardCode: "np1-4-1", actions: [], endMs: 0, extra: true }), "utf8");
    await writeFile(oversizedFile, " ".repeat(1_048_577), "utf8");
    const valid = spawnSync("npm", ["run", "--silent", "replay", "--", validFile], { encoding: "utf8" });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe("");
    expect(valid.stdout.split("\n")).toHaveLength(2);
    expect(JSON.parse(valid.stdout)).toMatchObject({ boardCode: "np1-4-1", matched: [0, 11], moves: 1, elapsedMs: 800 });
    for (const file of [invalidFile, oversizedFile, missingFile]) {
      const result = spawnSync("npm", ["run", "--silent", "replay", "--", file], { encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

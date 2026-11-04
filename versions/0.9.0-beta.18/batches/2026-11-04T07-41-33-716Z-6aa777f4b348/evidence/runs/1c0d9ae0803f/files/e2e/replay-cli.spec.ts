import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import { expect, test } from "@playwright/test";

function invokeReplay(input: string | null): SpawnSyncReturns<string> {
  const folder = mkdtempSync(join(tmpdir(), "neon-pairs-replay-"));
  try {
    const file = join(folder, "replay.json");
    if (input !== null) writeFileSync(file, input, "utf8");
    return spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "--silent", "replay", "--", file],
      { encoding: "utf8", timeout: 15_000 });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

test("documented replay command prints only the final snapshot on success", () => {
  const result = invokeReplay(JSON.stringify({ version: 1, boardCode: "np1-4-1",
    actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toMatchObject({ version: 1, boardCode: "np1-4-1",
    matched: [0, 11], selection: { kind: "closed" }, moves: 1, elapsedMs: 800, started: true });
});

test("invalid and unreadable replay files leave stdout empty and fail", () => {
  for (const input of ["{}", null]) {
    const result = invokeReplay(input);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim().length).toBeGreaterThan(0);
  }
});

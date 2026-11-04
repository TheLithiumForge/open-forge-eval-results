import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { replayGame } from "../src/game/replay.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";

test("replay CLI prints only the final snapshot or rejects with stderr", () => {
  const validPath = resolve("e2e/fixtures/example-match.json");
  const validText = readFileSync(validPath, "utf8");
  const expectedState = replayGame(validText);
  if (expectedState === null) throw new Error("The documented replay fixture must be valid.");
  const expectedOutput = `${encodeSnapshot(expectedState)}\n`;
  const good = spawnSync("npm", ["run", "--silent", "replay", "--", validPath], { encoding: "utf8" });
  expect(good.status).toBe(0);
  expect(good.stderr).toBe("");
  expect(good.stdout).toBe(expectedOutput);

  const invalidPath = resolve("e2e/fixtures/invalid-replay.json");
  const bad = spawnSync("npm", ["run", "--silent", "replay", "--", invalidPath], { encoding: "utf8" });
  expect(bad.status).not.toBe(0);
  expect(bad.stdout).toBe("");
  expect(bad.stderr).toContain("Invalid replay file.");
});

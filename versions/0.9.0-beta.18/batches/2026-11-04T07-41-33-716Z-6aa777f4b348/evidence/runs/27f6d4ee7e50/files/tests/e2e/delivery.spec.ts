import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { activateCards, loadBoardCode } from "./support.ts";

async function checkOfflineFile(browser: Browser): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const blockedRequests: string[] = [];
    await page.route(/^https?:\/\//, async (route) => {
      blockedRequests.push(route.request().url());
      await route.abort();
    });
    const url = pathToFileURL(resolve("dist/index.html")).href;
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Neon Pairs" })).toBeVisible();
    await loadBoardCode(page, "np1-4-1");
    await activateCards(page, [0, 11]);
    await expect(page.locator(".game-status")).toContainText("Pairs: 1/8");
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(page.locator(".game-status")).toContainText("Moves: 0");
    expect(blockedRequests).toEqual([]);
  } finally {
    await context.close();
  }
}

test("the single-file distribution plays from disk with HTTP access blocked and stays silent", async ({ browser }) => {
  const html = await readFile(resolve("dist/index.html"), "utf8");
  expect(html).not.toMatch(/<audio\b|<video\b|AudioContext|new Audio\s*\(|\.(?:mp3|ogg|wav)(?:["?#]|$)/i);
  await checkOfflineFile(browser);
});

test("replay CLI prints exact JSON for a valid file and stderr only for invalid input", async () => {
  const directory = await mkdtemp(join(tmpdir(), "neon-pairs-replay-"));
  const validPath = join(directory, "valid.json");
  const invalidPath = join(directory, "invalid.json");
  try {
    await writeFile(validPath, JSON.stringify({
      version: 1, boardCode: "np1-4-1",
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
    }));
    await writeFile(invalidPath, "{");
    const valid = spawnSync("npm", ["run", "--silent", "replay", "--", validPath], { cwd: process.cwd(), encoding: "utf8" });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe("");
    const expected = {
      version: 1, boardCode: "np1-4-1", matched: [0, 11], selection: { kind: "closed" },
      moves: 1, elapsedMs: 800, started: true,
    };
    expect(valid.stdout).toBe(`${JSON.stringify(expected, null, 2)}\n`);
    const invalid = spawnSync("npm", ["run", "--silent", "replay", "--", invalidPath], { cwd: process.cwd(), encoding: "utf8" });
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe("");
    expect(invalid.stderr).toBe("Invalid replay file.\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

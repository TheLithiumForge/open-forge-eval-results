import { expect, test } from "@playwright/test";
import { cardAt, completedSnapshot, pendingMismatchSnapshot } from "./helpers/game.ts";
import { saveJson } from "./helpers/evidence.ts";
import { freezePageTime } from "./helpers/board.ts";

async function importSnapshot(page: import("@playwright/test").Page, snapshot: string): Promise<void> {
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Snapshot JSON").fill(snapshot);
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
}

test("pause unfinished imports, keep arrows working, and resume the remembered card", async ({ page }) => {
  await freezePageTime(page);
  await page.goto("/");
  const source = JSON.stringify({
    version: 1,
    boardCode: "np1-4-1",
    matched: [],
    selection: { kind: "one", index: 0 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  });
  await importSnapshot(page, source);
  await expect(page.locator(".reproduction-status")).toHaveText(
    "Loaded snapshot. Select Resume to continue.",
  );
  await cardAt(page, 0).focus();
  await cardAt(page, 11).dispatchEvent("click", { button: 0 });
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  await page.keyboard.press("ArrowRight");
  await expect(cardAt(page, 1)).toBeFocused();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(cardAt(page, 1)).toBeFocused();
  await cardAt(page, 11).click();
  await expect(page.locator(".score-line")).toContainText("Moves: 1");
});

test("resume an imported mismatch after exactly its remaining active time", async ({ page }) => {
  await freezePageTime(page);
  await page.goto("/");
  await importSnapshot(page, pendingMismatchSnapshot("np1-4-1", 500));
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /revealed$/);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(299);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.runFor(1);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /closed$/);
});

test("load a completed snapshot without a pulse or a best-score write", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("neon-pairs.preferences.v1", JSON.stringify({
      size: 4,
      bestMoves: { "4": 7 },
    }));
    localStorage.setItem("unrelated", "preserved");
  });
  await page.reload();
  await importSnapshot(page, completedSnapshot("np1-4-1"));
  await expect(page.locator(".reproduction-status")).toHaveText("Loaded completed snapshot.");
  await expect(page.locator(".win-banner")).not.toHaveClass(/pulse/);
  await expect(page.locator(".score-line")).toContainText("Best: 7");
  const saved = await page.evaluate(() => ({
    preferences: localStorage.getItem("neon-pairs.preferences.v1"),
    unrelated: localStorage.getItem("unrelated"),
  }));
  expect(saved.unrelated).toBe("preserved");
  expect(saved.preferences).toContain('"4":7');
  await saveJson("completed-import.json", { status: "Loaded completed snapshot.", bestAfterImport: 7 });
});

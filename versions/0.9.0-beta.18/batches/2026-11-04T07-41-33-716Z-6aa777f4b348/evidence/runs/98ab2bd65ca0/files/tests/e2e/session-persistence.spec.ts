import { expect, test } from "@playwright/test";
import { cardAt, loadBoard, solveWithPointer } from "./helpers/game.ts";
import { freezePageTime } from "./helpers/board.ts";

async function playSlowNine(page: import("@playwright/test").Page): Promise<void> {
  await cardAt(page, 1).click();
  await cardAt(page, 2).click();
  await page.clock.runFor(800);
  await solveWithPointer(page, "np1-4-1");
  await expect(page.locator(".score-line")).toContainText("Moves: 9");
}

test("keep the better best score through equal and worse games and reload", async ({ page }) => {
  await freezePageTime(page);
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("neon-pairs.preferences.v1", JSON.stringify({ size: 4, bestMoves: {} }));
    localStorage.setItem("unrelated", "preserved");
  });
  await page.reload();
  await loadBoard(page, "np1-4-1");

  await playSlowNine(page);
  await expect(page.locator(".score-line")).toContainText("Best: 9");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await solveWithPointer(page, "np1-4-1");
  await expect(page.locator(".score-line")).toContainText("Best: 8");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await solveWithPointer(page, "np1-4-1");
  await expect(page.locator(".score-line")).toContainText("Best: 8");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await playSlowNine(page);
  await expect(page.locator(".score-line")).toContainText("Best: 8");

  const records = await page.evaluate(() => ({
    preference: localStorage.getItem("neon-pairs.preferences.v1"),
    unrelated: localStorage.getItem("unrelated"),
  }));
  expect(records.preference).toContain('"4":8');
  expect(records.unrelated).toBe("preserved");
  await page.getByLabel("Grid size").selectOption("6");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await expect(page.locator(".score-line")).toContainText("Best: none");
  await page.getByLabel("Grid size").selectOption("4");
  await expect(page.locator(".score-line")).toContainText("Best: 8");
});

test("keep invalid board and snapshot drafts and the current game", async ({ page }) => {
  await page.goto("/");
  await loadBoard(page, "np1-4-1");
  await cardAt(page, 0).click();
  await page.getByLabel("Board code").fill("np1-5-1");
  await page.getByRole("button", { name: "Load board", exact: true }).click();
  await expect(page.locator(".reproduction-status")).toHaveText("Invalid board code.");
  await expect(page.getByLabel("Board code")).toHaveValue("np1-5-1");
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed$/);

  await page.getByLabel("Snapshot JSON").fill('{"version":1,"extra":true}');
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
  await expect(page.locator(".reproduction-status")).toHaveText("Invalid snapshot.");
  await expect(page.getByLabel("Snapshot JSON")).toHaveValue('{"version":1,"extra":true}');
  await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed$/);
});

test("remain playable when browser storage access throws", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => { throw new DOMException("Storage is blocked.", "SecurityError"); },
    });
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173");
  await cardAt(page, 0).click();
  await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  await context.close();
});

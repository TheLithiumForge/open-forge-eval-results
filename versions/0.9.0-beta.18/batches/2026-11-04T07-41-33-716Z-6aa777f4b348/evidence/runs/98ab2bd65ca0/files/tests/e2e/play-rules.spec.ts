import { expect, test } from "@playwright/test";
import { cardAt, loadBoard } from "./helpers/game.ts";
import { freezePageTime } from "./helpers/board.ts";

test("count a turn once, ignore invalid activations, and close a miss at 800ms", async ({ page }) => {
  await freezePageTime(page);
  await page.goto("/");
  await loadBoard(page, "np1-4-1");

  await cardAt(page, 0).click();
  await cardAt(page, 0).click();
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  await cardAt(page, 11).click();
  await expect(page.locator(".score-line")).toContainText("Moves: 1");
  await cardAt(page, 0).dispatchEvent("click", { button: 0 });
  await expect(page.locator(".score-line")).toContainText("Pairs: 1/8");

  await cardAt(page, 1).click();
  await cardAt(page, 2).click();
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toHaveText("No match. Cards close after a short pause.");
  await cardAt(page, 3).dispatchEvent("click", { button: 0 });
  await expect(page.locator(".score-line")).toContainText("Moves: 2");
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.runFor(799);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.runFor(1);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /closed$/);
  await expect(live).toHaveText("No match. Cards close after a short pause.");
});

test("pause elapsed time and the mismatch together while the document is hidden", async ({ page }) => {
  await freezePageTime(page);
  await page.goto("/");
  await loadBoard(page, "np1-4-1");
  await cardAt(page, 1).click();
  await cardAt(page, 2).click();
  await page.clock.runFor(300);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(5000);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.locator(".score-line")).toContainText("Time: 0:00");

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(499);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.runFor(1);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /closed$/);
});

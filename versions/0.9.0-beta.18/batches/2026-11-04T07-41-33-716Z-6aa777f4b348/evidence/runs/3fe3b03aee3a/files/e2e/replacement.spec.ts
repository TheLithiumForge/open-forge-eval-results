import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { startDeal } from "./support.ts";

async function resetDuringMismatch(page: Page, action: "New Game" | "Restart"): Promise<void> {
  await startDeal(page, "np1-4-1");
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.clock.runFor(100);
  const start = page.getByRole("button", { name: action, exact: true });
  await start.click();
  await expect(start).toBeFocused();
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");
  await cards.nth(0).click();
  await page.clock.runFor(1_200);
  await expect(cards.nth(0)).toHaveAccessibleName(/, revealed$/);
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");
}

test("New Game and Restart both invalidate an old mismatch callback", async ({ page }) => {
  test.setTimeout(60_000);
  const clockStart = new Date("2020-01-01T00:00:00Z");
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1_000));
  await page.goto("/");

  await resetDuringMismatch(page, "New Game");
  await resetDuringMismatch(page, "Restart");
});

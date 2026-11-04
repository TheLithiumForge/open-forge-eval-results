import { expect, test } from "@playwright/test";
import { cardAt, loadBoard } from "./helpers/game.ts";
import { freezePageTime } from "./helpers/board.ts";

test("announce identical misses once each and stay quiet for focus, clocks, and closing", async ({ page }) => {
  await freezePageTime(page);
  await page.goto("/");
  await loadBoard(page, "np1-4-1");
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toHaveCount(1);
  await live.evaluate((region) => {
    const observer = new MutationObserver((records) => {
      const inserted = records.reduce((count, record) => count + record.addedNodes.length, 0);
      const current = Number(region.getAttribute("data-test-insertions") ?? 0);
      region.setAttribute("data-test-insertions", String(current + inserted));
    });
    observer.observe(region, { childList: true });
  });

  await cardAt(page, 1).click();
  await cardAt(page, 2).click();
  const miss = "No match. Cards close after a short pause.";
  await expect(live).toHaveText(miss);
  await expect(live).toHaveAttribute("data-test-insertions", "1");
  await page.keyboard.press("ArrowRight");
  await cardAt(page, 3).dispatchEvent("click", { button: 0 });
  await page.clock.runFor(800);
  await expect(cardAt(page, 1)).toHaveAttribute("aria-label", /closed$/);
  await expect(live).toHaveText(miss);
  await expect(live).toHaveAttribute("data-test-insertions", "1");

  await cardAt(page, 3).click();
  await cardAt(page, 4).click();
  await expect(live).toHaveText(miss);
  await expect(live).toHaveAttribute("data-test-insertions", "2");
});

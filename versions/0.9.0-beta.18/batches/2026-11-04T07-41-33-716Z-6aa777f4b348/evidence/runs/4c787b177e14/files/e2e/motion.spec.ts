import { expect, test } from "@playwright/test";
import { cardAt, finishBoardByClicks, startBoard } from "./helpers.ts";

test("removes card transitions and shows a static win banner for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  expect(await cardAt(page, 0).evaluate((card) => getComputedStyle(card).transitionDuration)).toBe("0s");
  await finishBoardByClicks(page, 4);
  const banner = page.locator(".win-banner");
  await expect(banner).toBeVisible();
  expect(await banner.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await banner.evaluate((element) => element.getAnimations().length)).toBe(0);
});

test("plays one 600ms completion pulse and then becomes static", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await startBoard(page);
  await finishBoardByClicks(page, 4);
  const banner = page.locator(".win-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toHaveClass(/win-celebrate/);
  expect(await banner.evaluate((element) => getComputedStyle(element).animationDuration)).toBe("0.6s");
  expect(await banner.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe("1");
  expect(await banner.evaluate((element) => element.getAnimations().length)).toBe(1);
  await page.waitForTimeout(650);
  expect(await banner.evaluate((element) => element.getAnimations().length)).toBe(0);
});

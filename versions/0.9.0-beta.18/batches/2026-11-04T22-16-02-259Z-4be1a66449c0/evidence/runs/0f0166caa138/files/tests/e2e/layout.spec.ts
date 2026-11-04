import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("a 16x16 board scrolls inside a narrow phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByLabel("Grid size").selectOption("16");
  const board = page.getByRole("group", { name: "Card board" });
  const cards = board.getByRole("button");
  await expect(cards).toHaveCount(256);
  const firstWidth = await cards.nth(0).evaluate((element) => element.getBoundingClientRect().width);
  expect(firstWidth).toBeGreaterThanOrEqual(44);
  const dimensions = await page.locator(".board-scroll").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  await cards.nth(0).focus();
  for (let row = 0; row < 15; row += 1) await page.keyboard.press("ArrowDown");
  for (let column = 0; column < 15; column += 1) await page.keyboard.press("ArrowRight");
  await expect(cards.nth(255)).toBeFocused();
});

test("the bundled HTML opens directly from disk", async ({ browser }) => {
  const context = await browser.newContext();
  await context.setOffline(true);
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  await expect(page.getByRole("heading", { name: "Neon Pairs" })).toBeVisible();
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await context.close();
});

import { expect, test } from "@playwright/test";
import { matchingPairs, playAllPairs, startDeal, completedSnapshot } from "./support.ts";

test("the 640x400 device-scale-2 layout stays readable and playable at 4x4 and 16x16", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173",
    viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto("/");
  for (const size of [4, 16]) {
    const code = "np1-" + size + "-1";
    await page.getByLabel("Grid size", { exact: true }).selectOption(String(size));
    await startDeal(page, code);
    const cards = page.locator(".memory-card");
    await expect(cards).toHaveCount(size * size);
    await cards.nth(0).click();
    await cards.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".score-strip")).toContainText("Moves: 1");

    const pairCount = size * size / 2;
    await page.getByLabel("Snapshot JSON", { exact: true }).fill(completedSnapshot(code, pairCount));
    await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
    await expect(page.locator(".win-banner")).toContainText("Completed in " + pairCount + " moves");
    await expect(page.locator(".win-banner .win-time")).toBeVisible();
    const layout = await page.evaluate(() => {
      const width = document.documentElement.scrollWidth;
      const summary = document.querySelector(".win-banner");
      const panels = [".deal-controls", ".score-strip", ".win-banner", ".board-scroll"].map((selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error("A game panel is missing.");
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
      });
      if (!(summary instanceof HTMLElement)) throw new Error("The win summary is missing.");
      return { width, panels };
    });
    expect(layout.width).toBe(640);
    for (const panel of layout.panels) {
      expect(panel.left).toBeGreaterThanOrEqual(0);
      expect(panel.right).toBeLessThanOrEqual(640);
    }
    for (let index = 1; index < layout.panels.length; index += 1) {
      const previous = layout.panels[index - 1];
      const current = layout.panels[index];
      if (previous === undefined || current === undefined) throw new Error("The zoom layout is incomplete.");
      expect(current.top).toBeGreaterThanOrEqual(previous.bottom);
    }
    if (size === 16) {
      await cards.nth(0).focus();
      for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowRight");
      for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowDown");
      await expect(cards.nth(255)).toBeFocused();
      await expect(cards.nth(255)).toHaveCSS("width", "44px");
    }
  }
  await context.close();
});

test("completion pulses once and reduced motion keeps it static; the game stays silent", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 800, height: 800 } });
  const page = await context.newPage();
  const start = new Date("2020-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1_000));
  await page.goto("/");
  await startDeal(page, "np1-4-1");
  const pairs = matchingPairs("np1-4-1");
  const cards = page.locator(".memory-card");
  for (const [first, second] of pairs.slice(0, -1)) {
    await cards.nth(first).click({ force: true });
    await cards.nth(second).click({ force: true });
  }
  const lastPair = pairs.at(-1);
  if (lastPair === undefined) throw new Error("The documented board has no pair.");
  await cards.nth(lastPair[0]).click({ force: true });
  await cards.nth(lastPair[1]).click({ force: true });
  const banner = page.locator(".win-banner");
  await expect(banner).toHaveClass(/is-celebrating/);
  expect(await banner.evaluate((element) => getComputedStyle(element).animationName)).not.toBe("none");
  expect(await banner.evaluate((element) => getComputedStyle(element).animationDuration)).toBe("0.6s");
  expect(await banner.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe("1");
  await page.clock.runFor(599);
  await expect(banner).toHaveClass(/is-celebrating/);
  await page.clock.runFor(1);
  await expect(banner).not.toHaveClass(/is-celebrating/);
  await expect(banner).toBeVisible();
  await expect(page.locator("audio,video")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /sound/i })).toHaveCount(0);
  await context.close();

  const reduced = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 800, height: 800 } });
  const reducedPage = await reduced.newPage();
  await reducedPage.emulateMedia({ reducedMotion: "reduce" });
  await reducedPage.clock.install({ time: start });
  await reducedPage.clock.pauseAt(new Date(start.getTime() + 1_000));
  await reducedPage.goto("/");
  await startDeal(reducedPage, "np1-4-1");
  await playAllPairs(reducedPage, "np1-4-1");
  const staticBanner = reducedPage.locator(".win-banner");
  await expect(staticBanner).toHaveClass(/is-celebrating/);
  await expect(staticBanner).toHaveCSS("animation-name", "none");
  await expect(reducedPage.locator(".memory-card").first()).toHaveCSS("transition-duration", "0s");
  await reduced.close();
});

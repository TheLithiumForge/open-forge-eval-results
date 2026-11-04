import { expect, test } from "@playwright/test";
import { cards, clickPairs, CODE_4, loadBoard, MATCHES, openWithFrozenClock } from "./helpers.ts";

test("preferences and per-size best scores survive reloads with better, equal, and worse outcomes", async ({ page }) => {
  await openWithFrozenClock(page);
  await page.evaluate(() => {
    localStorage.setItem("neonPairs.preferences.v1", JSON.stringify({ version: 1, size: 4 }));
    localStorage.setItem("neonPairs.bestScores.v1", JSON.stringify({ version: 1, scores: { "4": 10 } }));
    localStorage.setItem("unrelated.preference", "preserved");
  });
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Grid size" })).toHaveValue("4");
  await expect(page.getByText("Best: 10", { exact: true })).toBeVisible();
  await loadBoard(page, CODE_4);
  await clickPairs(page);
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();

  await loadBoard(page, CODE_4);
  await clickPairs(page);
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
  await page.reload();
  await loadBoard(page, CODE_4);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(800);
  await clickPairs(page);
  await expect(page.getByText("Moves: 9", { exact: true })).toBeVisible();
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();

  await page.getByRole("combobox", { name: "Grid size" }).selectOption("6");
  await expect(page.getByText("Best: none", { exact: true })).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem("unrelated.preference"))).resolves.toBe("preserved");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Grid size" })).toHaveValue("6");
  await expect(page.getByText("Best: none", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Grid size" }).selectOption("4");
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
});

test("invalid saved values are ignored and inaccessible storage never prevents play", async ({ browser }) => {
  const malformed = await browser.newContext();
  const first = await malformed.newPage();
  await first.goto("http://127.0.0.1:4173/");
  await first.evaluate(() => {
    localStorage.setItem("neonPairs.preferences.v1", '{"version":1,"size":5}');
    localStorage.setItem("neonPairs.bestScores.v1", '{"version":1,"scores":{"4":1000000,"6":2.5}}');
  });
  await first.reload();
  await expect(first.getByRole("combobox", { name: "Grid size" })).toHaveValue("4");
  await expect(first.getByText("Best: none", { exact: true })).toBeVisible();
  await malformed.close();

  const blocked = await browser.newContext();
  try {
    await blocked.addInitScript(() => Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("Storage is unavailable", "SecurityError"); },
    }));
    const page = await blocked.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await loadBoard(page, CODE_4);
    await clickPairs(page, MATCHES);
    await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
  } finally {
    await blocked.close();
  }
});

test("page visibility pauses elapsed time and a pending miss", async ({ page }) => {
  await openWithFrozenClock(page);
  await loadBoard(page, CODE_4);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(5_000);
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(499);
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.runFor(1);
  await cards(page).nth(2).click();
  await expect(cards(page).nth(2)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByText("Time: 0:00", { exact: true })).toBeVisible();
});

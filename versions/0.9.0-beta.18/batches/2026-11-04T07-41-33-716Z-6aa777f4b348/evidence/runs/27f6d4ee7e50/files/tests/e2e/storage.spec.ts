import { expect, test } from "@playwright/test";
import { activateCard, boardCards, openGame } from "./support.ts";

const preferencesKey = "neon-pairs.preferences.v1";

test("invalid saved fields are ignored and unrelated storage survives preference writes", async ({ page }) => {
  await page.addInitScript((key) => {
    if (window.localStorage.getItem("unrelated") === null) {
      window.localStorage.setItem(key, JSON.stringify({
        version: 1,
        size: 5,
        bestMoves: { 4: 1_000_000, 6: 2.5, 8: -1, 10: "8", 12: 999_999, 16: 7 },
      }));
      window.localStorage.setItem("unrelated", "preserve me");
    }
  }, preferencesKey);
  await openGame(page);
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.locator(".game-status")).toContainText("Best: none");
  await page.getByLabel("Grid size").selectOption("12");
  await expect(page.getByLabel("Grid size")).toHaveValue("12");
  await expect(page.locator(".game-status")).toContainText("Best: 999999");
  await page.getByLabel("Grid size").selectOption("16");
  await expect(page.locator(".game-status")).toContainText("Best: 7");
  const unrelated = await page.evaluate(() => window.localStorage.getItem("unrelated"));
  expect(unrelated).toBe("preserve me");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("16");
  await expect(page.locator(".game-status")).toContainText("Best: 7");
});

test("malformed saved preferences use defaults and storage denial leaves play available", async ({ page, browser }) => {
  await page.addInitScript((key) => window.localStorage.setItem(key, "{"), preferencesKey);
  await openGame(page);
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.locator(".game-status")).toContainText("Best: none");
  await page.getByLabel("Grid size").selectOption("6");
  await expect(boardCards(page)).toHaveCount(36);

  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173" });
  try {
    const blockedPage = await context.newPage();
    await blockedPage.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get: () => { throw new DOMException("Storage denied", "SecurityError"); },
      });
    });
    await openGame(blockedPage);
    await blockedPage.getByLabel("Grid size").selectOption("6");
    await expect(boardCards(blockedPage)).toHaveCount(36);
    await activateCard(blockedPage, 0);
    await expect(boardCards(blockedPage).nth(0)).toHaveAttribute("aria-label", /revealed/);
    await blockedPage.getByRole("button", { name: "New Game" }).click();
    await expect(blockedPage.locator(".game-status")).toContainText("Moves: 0");
  } finally {
    await context.close();
  }
});

import { expect, test } from "@playwright/test";
import { cardButtons, deckFor, loadBoard, mismatchFor, pairsFor, revealPairs, REPLAYABLE_CODE } from "./support.ts";

test("persists selected size and keeps invalid saved preferences safe", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("neon-pairs.preferences.v1") === null) {
      localStorage.setItem("neon-pairs.preferences.v1", JSON.stringify({ size: 5, bests: { "4": 1.5, "6": 99999999 } }));
      localStorage.setItem("unrelated", "preserved");
    }
  });
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByText("Best: none")).toBeVisible();
  await page.getByLabel("Grid size").selectOption("8");
  await expect(page.getByLabel("Grid size")).toHaveValue("8");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("8");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
  const unrelated = await page.evaluate(() => localStorage.getItem("unrelated"));
  expect(unrelated).toBe("preserved");
  const code = await page.getByLabel("Board code").inputValue();
  expect(code).toMatch(/^np1-8-[1-9][0-9]*$/);
});

test("runs on a page where local storage access throws", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => { throw new DOMException("Storage is blocked", "SecurityError"); },
  }));
  await page.goto("/");
  await expect(cardButtons(page)).toHaveCount(16);
  await page.getByLabel("Grid size").selectOption("6");
  await expect(cardButtons(page)).toHaveCount(36);
  await expect(page.getByText("Moves: 0")).toBeVisible();
});

test("keeps the best move record across fresh, equal and worse games", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    if (localStorage.getItem("neon-pairs.preferences.v1") === null) {
      localStorage.setItem("neon-pairs.preferences.v1", JSON.stringify({ size: 4, bests: { "4": 9 } }));
    }
  });
  await page.goto("/");
  await loadBoard(page, REPLAYABLE_CODE);
  await revealPairs(page, pairsFor(deckFor(REPLAYABLE_CODE)));
  await expect(page.getByText("Best: 8")).toBeVisible();
  await expect(page.locator(".win-banner")).toBeVisible();
  await expect(page.locator(".board-scroll")).toHaveCount(1);
  const recorded = await page.evaluate(() => localStorage.getItem("neon-pairs.preferences.v1"));
  expect(recorded).toContain('"4":8');

  const firstCode = await page.getByLabel("Board code").inputValue();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByLabel("Board code")).not.toHaveValue(firstCode);
  const secondCode = await page.getByLabel("Board code").inputValue();
  await revealPairs(page, pairsFor(deckFor(secondCode)));
  await expect(page.getByText("Best: 8")).toBeVisible();
  await expect(page.locator(".board-scroll")).toHaveCount(1);

  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByLabel("Board code")).not.toHaveValue(secondCode);
  const thirdCode = await page.getByLabel("Board code").inputValue();
  const deck = deckFor(thirdCode);
  const [missA, missB] = mismatchFor(deck);
  await cardButtons(page).nth(missA).click();
  await cardButtons(page).nth(missB).click();
  await page.waitForTimeout(850);
  await revealPairs(page, pairsFor(deck));
  await expect(page.getByText("Moves: 9")).toBeVisible();
  await expect(page.getByText("Best: 8")).toBeVisible();
  const finalRecord = await page.evaluate(() => localStorage.getItem("neon-pairs.preferences.v1"));
  expect(finalRecord).toContain('"4":8');
});


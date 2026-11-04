import { expect, test } from "@playwright/test";
import { activateCard, activateCards, boardCards, freezeClock, loadBoardCode, openGame, readBoardCode } from "./support.ts";
import { referenceDeck, referencePairs } from "./reference-deck.ts";

test("a deterministic board matches immediately and ignores input through the 800ms mismatch", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await loadBoardCode(page, "np1-4-1");
  expect(referenceDeck(await readBoardCode(page)).slice(0, 4)).toEqual([6, 7, 0, 5]);

  await activateCard(page, 0);
  await activateCard(page, 0);
  await expect(page.locator(".game-status")).toContainText("Moves: 0");
  await expect(boardCards(page).nth(0)).toHaveAttribute("aria-label", /cyan solid plus, marker top, revealed/);
  await activateCard(page, 11);
  await expect(page.locator(".game-status")).toContainText("Moves: 1");
  await expect(page.locator(".game-status")).toContainText("Pairs: 1/8");
  await expect(page.locator(".turn-announcement")).toHaveText("Pair found. 1 pair matched.");

  await activateCard(page, 2);
  await activateCard(page, 3);
  await expect(page.locator(".turn-announcement")).toHaveText("No match. Cards close after a short pause.");
  await activateCard(page, 4);
  await expect(page.locator(".game-status")).toContainText("Moves: 2");
  await expect(boardCards(page).nth(4)).toHaveAttribute("aria-label", /closed/);
  await page.clock.runFor(799);
  await expect(boardCards(page).nth(2)).toHaveAttribute("aria-label", /revealed/);
  await page.clock.runFor(1);
  await expect(boardCards(page).nth(2)).toHaveAttribute("aria-label", /closed/);
  await expect(boardCards(page).nth(3)).toHaveAttribute("aria-label", /closed/);
  await expect(page.locator(".turn-announcement")).toHaveText("No match. Cards close after a short pause.");
});

test("finishes every supported board size using pairs from the visible board code", async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page);
  for (const size of [4, 6, 8, 10, 12, 14, 16]) {
    if (size !== 4) await page.getByLabel("Grid size").selectOption(String(size));
    const deck = referenceDeck(await readBoardCode(page));
    const pairs = referencePairs(deck);
    await expect(boardCards(page)).toHaveCount(size * size);
    await activateCards(page, pairs.flatMap(([first, second]) => [first, second]));
    await expect(page.locator(".game-status")).toContainText(`Moves: ${pairs.length}`);
    await expect(page.locator(".game-status")).toContainText(`Pairs: ${pairs.length}/${pairs.length}`);
    await expect(page.locator(".game-status")).toContainText(`Best: ${pairs.length}`);
    await expect(page.locator(".win-banner")).toContainText(`All pairs found in ${pairs.length} moves`);
    await expect(page.locator(".card--matched")).toHaveCount(size * size);
  }
});

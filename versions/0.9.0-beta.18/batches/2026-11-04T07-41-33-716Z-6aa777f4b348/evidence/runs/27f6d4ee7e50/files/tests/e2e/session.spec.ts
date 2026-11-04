import { expect, test } from "@playwright/test";
import { activateCard, activateCards, boardCards, freezeClock, installVisibilityDriver, loadBoardCode, loadSnapshot, openGame, readBoardCode, setSimulatedHidden } from "./support.ts";
import { referenceDeck, referencePairs } from "./reference-deck.ts";

const mismatchSnapshot = {
  version: 1,
  boardCode: "np1-4-1",
  matched: [0, 11],
  selection: { kind: "mismatch", first: 1, second: 2, remainingMs: 300 },
  moves: 2,
  elapsedMs: 1_500,
  started: true,
};

test("an imported mismatch stays paused and Resume restores remembered focus and active time", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await loadSnapshot(page, mismatchSnapshot);
  const cards = boardCards(page);
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await cards.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect(cards.nth(5)).toBeFocused();
  await page.clock.runFor(5_000);
  await activateCard(page, 4);
  await expect(cards.nth(4)).toHaveAttribute("aria-label", /closed/);
  await expect(page.locator(".game-status")).toContainText("Time: 0:01");

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(cards.nth(5)).toBeFocused();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(cards.nth(1)).toHaveAttribute("aria-label", /revealed/);
  await page.clock.runFor(1);
  await expect(cards.nth(1)).toHaveAttribute("aria-label", /closed/);
  await expect(cards.nth(2)).toHaveAttribute("aria-label", /closed/);
  await expect(page.locator(".game-status")).toContainText("Moves: 2");
  await expect(page.locator(".game-status")).toContainText("Time: 0:01");
});

test("page visibility pauses and resumes only the mismatch's remaining active time", async ({ page }) => {
  await freezeClock(page);
  await installVisibilityDriver(page);
  await openGame(page);
  await loadBoardCode(page, "np1-4-1");
  await activateCard(page, 2);
  await activateCard(page, 3);
  await page.clock.runFor(200);
  await setSimulatedHidden(page, true);
  await page.clock.runFor(5_000);
  await expect(boardCards(page).nth(2)).toHaveAttribute("aria-label", /revealed/);
  await setSimulatedHidden(page, false);
  await page.clock.runFor(599);
  await expect(boardCards(page).nth(3)).toHaveAttribute("aria-label", /revealed/);
  await page.clock.runFor(1);
  await expect(boardCards(page).nth(2)).toHaveAttribute("aria-label", /closed/);
  await expect(page.locator(".game-status")).toContainText("Moves: 1");
});

test("restart, New Game, and loading a board invalidate old mismatch timers", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  for (const replacement of ["restart", "new", "load"] as const) {
    await loadBoardCode(page, "np1-4-1");
    await activateCard(page, 2);
    await activateCard(page, 3);
    await page.clock.runFor(300);
    if (replacement === "restart") await page.getByRole("button", { name: "Restart" }).click();
    if (replacement === "new") await page.getByRole("button", { name: "New Game" }).click();
    if (replacement === "load") await loadBoardCode(page, "np1-4-1");
    await activateCard(page, 0);
    await page.clock.runFor(600);
    await expect(boardCards(page).nth(0)).toHaveAttribute("aria-label", /revealed/);
    await expect(page.locator(".game-status")).toContainText("Moves: 0");
  }
});

test("live completions persist only a better score and reload it", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await loadBoardCode(page, "np1-4-1");
  const pairs = referencePairs(referenceDeck(await readBoardCode(page)));
  const matches = pairs.flatMap(([first, second]) => [first, second]);

  await activateCards(page, [0, 1]);
  await page.clock.runFor(800);
  await activateCards(page, matches);
  await expect(page.locator(".game-status")).toContainText("Best: 9");
  await page.getByRole("button", { name: "Restart" }).click();
  await activateCards(page, matches);
  await expect(page.locator(".game-status")).toContainText("Best: 8");
  await page.getByRole("button", { name: "Restart" }).click();
  await activateCards(page, matches);
  await expect(page.locator(".game-status")).toContainText("Best: 8");
  await page.getByRole("button", { name: "Restart" }).click();
  await activateCards(page, [0, 1]);
  await page.clock.runFor(800);
  await activateCards(page, matches);
  await expect(page.locator(".game-status")).toContainText("Best: 8");
  await page.reload();
  await expect(page.locator(".game-status")).toContainText("Best: 8");
});

test("resuming an unfinished imported game records its live win", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  const pairs = referencePairs(referenceDeck("np1-4-1"));
  const matched = pairs.slice(0, -1).flatMap(([first, second]) => [first, second]);
  const finalPair = pairs.at(-1);
  if (finalPair === undefined) throw new Error("Expected a final pair.");
  const snapshot = {
    version: 1, boardCode: "np1-4-1", matched, selection: { kind: "closed" },
    moves: 7, elapsedMs: 5_000, started: true,
  };
  await loadSnapshot(page, snapshot);
  await expect(boardCards(page).nth(finalPair[0])).toHaveAttribute("aria-label", /closed/);
  await activateCard(page, finalPair[0]);
  await expect(page.locator(".game-status")).toContainText("Moves: 7");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(boardCards(page).nth(0)).toBeFocused();
  await activateCards(page, [...finalPair]);
  await expect(page.locator(".game-status")).toContainText("Best: 8");
  await expect(page.locator(".win-banner")).toHaveClass(/win-banner--pulse/);
});

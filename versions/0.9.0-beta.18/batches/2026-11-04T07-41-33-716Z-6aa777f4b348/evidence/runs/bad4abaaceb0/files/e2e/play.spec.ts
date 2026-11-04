import { expect, test } from "@playwright/test";
import { cardButtons, deckFor, loadBoard, mismatchFor, offlineHtmlUrl, pairsFor, REPLAYABLE_CODE } from "./support.ts";

test("the file distribution plays without network access and starts with hidden cards", async ({ page }) => {
  const outsideRequests: string[] = [];
  await page.route("**/*", async (route) => {
    if (!route.request().url().startsWith("file:")) {
      outsideRequests.push(route.request().url());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  await page.goto(offlineHtmlUrl());
  await expect(page.getByRole("heading", { name: "Neon Pairs" })).toBeVisible();
  await expect(cardButtons(page)).toHaveCount(16);
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await expect(page.getByText("Pairs: 0/8")).toBeVisible();
  await expect(page.getByText("Time: 0:00")).toBeVisible();
  await expect(page.locator("svg.face-artwork")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("cyan solid circle");
  await expect(page.locator("details")).not.toHaveAttribute("open", "");
  expect(await page.evaluate(() => document.activeElement?.tagName ?? null)).not.toBe("BUTTON");
  expect(outsideRequests).toEqual([]);
});

test("repeats, matches, misses, and keeps non-card interactions out of turns", async ({ page }) => {
  await page.goto(offlineHtmlUrl());
  await loadBoard(page, REPLAYABLE_CODE);
  const cards = cardButtons(page);
  await cards.nth(0).hover();
  await cards.nth(0).dispatchEvent("pointercancel");
  await cards.nth(0).click({ button: "right" });
  await expect(cards.nth(0)).toHaveAttribute("aria-label", /closed$/);
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await cards.nth(0).click();
  await cards.nth(0).click();
  await expect(page.getByText("Moves: 0")).toBeVisible();
  const deck = deckFor(REPLAYABLE_CODE);
  const pair = deck.findIndex((face, index) => index > 0 && deck[0] === face);
  expect(pair).toBeGreaterThan(0);
  await cards.nth(pair).click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await expect(page.getByText("Pairs: 1/8")).toBeVisible();

  const [first, second] = mismatchFor(deck, [0, pair]);
  await cards.nth(first).click();
  await cards.nth(second).click();
  await expect(page.getByText("Moves: 2")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  await cards.nth(4).click();
  await cards.nth(5).click({ button: "right" });
  await cards.nth(6).dispatchEvent("pointercancel");
  await expect(page.getByText("Moves: 2")).toBeVisible();
  await page.waitForTimeout(850);
  await expect(cards.nth(first)).toHaveAttribute("aria-label", /closed$/);
  await expect(cards.nth(second)).toHaveAttribute("aria-label", /closed$/);
});

test("uses one roving tab stop with bounded, modifier-free arrow navigation", async ({ page }) => {
  await page.goto(offlineHtmlUrl());
  await page.getByLabel("Grid size").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cardButtons(page).nth(0)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(cardButtons(page).nth(0)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cardButtons(page).nth(1)).toBeFocused();
  await page.keyboard.press("Control+ArrowRight");
  await expect(cardButtons(page).nth(1)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  expect(await cardButtons(page).evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length)).toBe(1);
});

test("Enter and Space share activation while modified activation is ignored", async ({ page }) => {
  await page.goto(offlineHtmlUrl());
  await loadBoard(page, REPLAYABLE_CODE);
  const deck = deckFor(REPLAYABLE_CODE);
  const pair = pairsFor(deck).find(([first, second]) => first === 0 || second === 0);
  if (!pair) throw new Error("Expected a pair at the first card");
  const partner = pair[0] === 0 ? pair[1] : pair[0];
  const cards = cardButtons(page);

  await cards.nth(0).focus();
  await page.keyboard.press("Control+Enter");
  await expect(cards.nth(0)).toHaveAttribute("aria-label", /closed$/);
  await page.keyboard.press("Shift+Space");
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(cards.nth(0)).toHaveAttribute("aria-label", /revealed$/);
  const startRow = 0;
  const targetRow = Math.floor(partner / 4);
  const targetColumn = partner % 4;
  for (let row = startRow; row < targetRow; row += 1) await page.keyboard.press("ArrowDown");
  for (let column = 0; column < targetColumn; column += 1) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await expect(page.getByText("Pairs: 1/8")).toBeVisible();
});


import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cardButtons, deckFor, offlineHtmlUrl, pairsFor } from "./support.ts";

async function moveWithArrows(page: Page, from: number, to: number, columns: number): Promise<void> {
  let current = from;
  while (current % columns < to % columns) {
    await page.keyboard.press("ArrowRight");
    current += 1;
  }
  while (current % columns > to % columns) {
    await page.keyboard.press("ArrowLeft");
    current -= 1;
  }
  while (Math.floor(current / columns) < Math.floor(to / columns)) {
    await page.keyboard.press("ArrowDown");
    current += columns;
  }
  while (Math.floor(current / columns) > Math.floor(to / columns)) {
    await page.keyboard.press("ArrowUp");
    current -= columns;
  }
}

test("completes the accessible 4x4 keyboard journey and records its tree", async ({ page, browser }) => {
  await page.goto(offlineHtmlUrl());
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Grid size")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cardButtons(page).nth(0)).toBeFocused();

  const controls = await page.locator(".game-controls").ariaSnapshot();
  const closedCard = await cardButtons(page).nth(0).ariaSnapshot();
  const deck = deckFor(await page.getByLabel("Board code").inputValue());
  const pairs = pairsFor(deck);
  const firstPair = pairs.find(([first, second]) => first === 0 || second === 0);
  if (!firstPair) throw new Error("Expected a pair in the example deck");
  await page.keyboard.press("Enter");
  const revealedCard = await cardButtons(page).nth(0).ariaSnapshot();
  const partner = firstPair[0] === 0 ? firstPair[1] : firstPair[0];
  await moveWithArrows(page, 0, partner, 4);
  await page.keyboard.press("Space");
  await expect(page.getByRole("status")).toHaveText("Pair found. 1 pair matched.");
  const firstMatch = await page.getByRole("status").ariaSnapshot();
  await expect(cardButtons(page).nth(firstPair[0])).toHaveAttribute("aria-disabled", "true");
  await cardButtons(page).nth(firstPair[0]).focus();
  await expect(cardButtons(page).nth(firstPair[0])).toBeFocused();

  let current = firstPair[0];
  for (const [first, second] of pairs.slice(1)) {
    if (first === 0 || second === 0) continue;
    await moveWithArrows(page, current, first, 4);
    await page.keyboard.press("Enter");
    current = first;
    await moveWithArrows(page, current, second, 4);
    await page.keyboard.press("Enter");
    current = second;
  }
  await expect(page.locator(".win-banner")).toContainText("8 moves");
  await expect(page.getByRole("status")).toContainText("All pairs found in 8 moves");
  await expect(page.getByText("Pairs: 8/8")).toBeVisible();
  const finalStatus = await page.getByRole("status").ariaSnapshot();
  const win = await page.locator(".win-banner").ariaSnapshot();

  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 0")).toBeVisible();

  const report = [
    "# Automated accessibility tree evidence",
    "",
    `Browser: Chromium ${browser.version()}; Playwright: 1.64.1; viewport: 1280x720 CSS pixels.`,
    "Screen reader spoken output was not tested. Spoken confirmation remains part of user acceptance.",
    "",
    "## Named controls",
    "",
    "```yaml",
    controls,
    "```",
    "",
    "## Closed and revealed card names",
    "",
    "```yaml",
    closedCard,
    revealedCard,
    "```",
    "",
    "## Match and win announcements",
    "",
    "```yaml",
    firstMatch,
    finalStatus,
    win,
    "```",
  ].join("\n");
  await mkdir(resolve("evidence"), { recursive: true });
  await writeFile(resolve("evidence/accessibility.md"), report, "utf8");
});


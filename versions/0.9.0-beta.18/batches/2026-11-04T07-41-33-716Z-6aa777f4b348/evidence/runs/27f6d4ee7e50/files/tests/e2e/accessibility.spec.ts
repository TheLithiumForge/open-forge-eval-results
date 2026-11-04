import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { activateCard, announcementCount, boardCards, freezeClock, loadBoardCode, openGame, saveEvidence, watchAnnouncements } from "./support.ts";
import { referenceDeck, referencePairs } from "./reference-deck.ts";

async function moveFocus(page: Page, from: number, to: number, size: number): Promise<number> {
  let current = from;
  while (Math.floor(current / size) < Math.floor(to / size)) {
    await page.keyboard.press("ArrowDown");
    current += size;
  }
  while (Math.floor(current / size) > Math.floor(to / size)) {
    await page.keyboard.press("ArrowUp");
    current -= size;
  }
  while (current % size < to % size) {
    await page.keyboard.press("ArrowRight");
    current += 1;
  }
  while (current % size > to % size) {
    await page.keyboard.press("ArrowLeft");
    current -= 1;
  }
  return current;
}

test("the complete 4x4 keyboard journey exposes names, announces turns, and exits natively", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  const initialTree = await page.locator("main").ariaSnapshot();
  expect(initialTree).toContain('combobox "Grid size"');
  expect(initialTree).toContain('button "New Game"');
  expect(initialTree).toContain('group "Game board"');
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);
  await expect(page.locator(".turn-announcement")).toHaveAttribute("aria-atomic", "true");
  await watchAnnouncements(page);

  const pairs = referencePairs(referenceDeck(await page.locator("#board-code").inputValue()));
  await page.keyboard.press("Tab");
  await expect(boardCards(page).nth(0)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Grid size")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByLabel("Grid size")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(boardCards(page).nth(0)).toBeFocused();
  const closedName = await boardCards(page).nth(0).getAttribute("aria-label");
  expect(closedName).toMatch(/^Row 1, column 1, closed$/);
  await expect(page.locator(".face-artwork")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(boardCards(page).nth(0)).toBeFocused();
  await expect(page.locator(".game-status")).toContainText("Moves: 0");

  const snapshots: Array<readonly [string, string]> = [
    ["Initial tree", initialTree], ["Closed first card", await page.locator("main").ariaSnapshot()],
  ];
  let focus = 0;
  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
    const pair = pairs[pairIndex];
    if (pair === undefined) throw new Error("Expected a complete pair.");
    const [first, second] = pair;
    focus = await moveFocus(page, focus, first, 4);
    await page.keyboard.press("Enter");
    if (pairIndex === 0) {
      await expect(boardCards(page).nth(first)).toHaveAttribute("aria-label", /revealed/);
      expect(await boardCards(page).nth(first).getAttribute("aria-label")).not.toContain("closed");
      await expect(page.locator(".face-artwork")).toHaveCount(1);
      snapshots.push(["First face revealed", await page.locator("main").ariaSnapshot()]);
    }
    focus = await moveFocus(page, focus, second, 4);
    await page.keyboard.press("Space");
    const expected = pairIndex === pairs.length - 1
      ? "Pair found. All pairs found in 8 moves and 0:00."
      : `Pair found. ${pairIndex + 1} ${pairIndex === 0 ? "pair" : "pairs"} matched.`;
    await expect(page.locator(".turn-announcement")).toHaveText(expected);
    await expect.poll(() => announcementCount(page)).toBe(pairIndex + 1);
  }

  await expect(page.locator(".win-banner")).toContainText("All pairs found in 8 moves and 0:00.");
  await expect(boardCards(page).nth(focus)).toHaveAttribute("aria-disabled", "true");
  snapshots.push(["Completed game", await page.locator("main").ariaSnapshot()]);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Grid size")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".game-status")).toContainText("Moves: 0");
  snapshots.push(["New game after native Tab exit", await page.locator("main").ariaSnapshot()]);
  const evidence = snapshots.map(([stage, tree]) => {
    const indentedTree = tree.split("\n").map((line) => `  ${line}`).join("\n");
    return `${JSON.stringify(stage)}: |-\n${indentedTree}`;
  }).join("\n");
  await saveEvidence("evidence/accessibility/4x4-keyboard-journey.yml", evidence);
});

test("consecutive identical misses each announce once; mismatch closure stays silent", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await loadBoardCode(page, "np1-4-1");
  await watchAnnouncements(page);
  for (const [first, second] of [[0, 1], [2, 3]] as const) {
    await activateCard(page, first);
    await activateCard(page, second);
    await expect(page.locator(".turn-announcement")).toHaveText("No match. Cards close after a short pause.");
    await expect.poll(() => announcementCount(page)).toBe(first === 0 ? 1 : 2);
    if (first === 0) await page.clock.runFor(800);
    else {
      // Flush the 1-second elapsed-time render before advancing the remaining mismatch interval.
      await page.clock.runFor(201);
      await expect(page.locator(".game-status")).toContainText("Time: 0:01");
      await page.clock.runFor(601);
    }
    await expect(boardCards(page).nth(first)).toHaveAttribute("aria-label", /closed/);
    await expect.poll(() => announcementCount(page)).toBe(first === 0 ? 1 : 2);
  }
});

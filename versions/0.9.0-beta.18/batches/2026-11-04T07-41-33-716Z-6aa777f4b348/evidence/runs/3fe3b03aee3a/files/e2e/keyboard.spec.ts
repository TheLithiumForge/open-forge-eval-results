import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { matchingPairs, startDeal } from "./support.ts";

async function moveByArrows(page: import("@playwright/test").Page, from: number, to: number, size: number): Promise<void> {
  let row = Math.floor(from / size);
  let column = from % size;
  const targetRow = Math.floor(to / size);
  const targetColumn = to % size;
  while (row < targetRow) { await page.keyboard.press("ArrowDown"); row += 1; }
  while (row > targetRow) { await page.keyboard.press("ArrowUp"); row -= 1; }
  while (column < targetColumn) { await page.keyboard.press("ArrowRight"); column += 1; }
  while (column > targetColumn) { await page.keyboard.press("ArrowLeft"); column -= 1; }
}

test("only unmodified arrows navigate; native activation, context menu and Tab stay intact", async ({ page }) => {
  await page.goto("/");
  await startDeal(page, "np1-4-1");
  const cards = page.locator(".memory-card");
  await expect(cards).toHaveCount(16);
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
  await expect(cards.nth(0).locator(".face-art")).toHaveCount(0);
  await expect(page.locator(".memory-card[data-face],.memory-card[data-face-id]")).toHaveCount(0);

  await cards.nth(0).hover();
  await cards.nth(0).dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch", bubbles: true });
  await cards.nth(0).click({ button: "right" });
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");

  await cards.nth(0).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(cards.nth(0)).toBeFocused();
  await page.keyboard.press("Control+Enter");
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
  await page.keyboard.press("ArrowRight");
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press("Control+ArrowDown");
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cards.nth(1)).toHaveAccessibleName(/revealed/);
  await page.keyboard.press("Space");
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.locator(".score-strip")).toContainText("Moves: 1");
  await page.keyboard.press("ArrowRight");
  await expect(cards.nth(3)).toBeFocused();
  await cards.nth(3).click();
  await expect(page.locator(".score-strip")).toContainText("Moves: 1");
  await page.waitForTimeout(850);
  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(cards.nth(3)).toBeFocused();
});

test("a complete 4x4 keyboard journey is present in the accessibility tree", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await expect(page.getByLabel("Grid size", { exact: true })).toHaveValue("4");
  await expect(page.getByRole("button", { name: "New Game", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New Game", exact: true }).click();
  await startDeal(page, "np1-4-1");

  const cards = page.locator(".memory-card");
  await page.getByRole("button", { name: "Restart", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(cards.nth(0)).toBeFocused();
  const names: string[] = [];
  names.push(await page.locator(".board-grid").ariaSnapshot());
  let cursor = 0;
  for (const [turn, pair] of matchingPairs("np1-4-1").entries()) {
    const [first, second] = pair;
    await moveByArrows(page, cursor, first, 4);
    await page.keyboard.press(turn % 2 === 0 ? "Space" : "Enter");
    if (turn === 0) names.push(await page.locator(".board-grid").ariaSnapshot());
    await moveByArrows(page, first, second, 4);
    await page.keyboard.press(turn % 2 === 0 ? "Enter" : "Space");
    cursor = second;
    if (turn === 0) names.push(await page.locator(".board-grid").ariaSnapshot());
  }
  await expect(page.locator(".win-banner")).toContainText("Completed in 8 moves");
  await expect(page.getByRole("status")).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  names.push(await page.locator("main").ariaSnapshot());
  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(cards.nth(cursor)).toBeFocused();
  await moveByArrows(page, cursor, 0, 4);
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Restart", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "New Game", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");

  const browserVersion = page.context().browser()?.version() ?? "unknown";
  const content = `# Automated keyboard accessibility tree journey

Browser: Chromium ${browserVersion}. Automation: Playwright 1.64.1.
No screen reader was used. Spoken output remains part of user acceptance.

The journey found Grid size and New Game by their accessible names, entered a deterministic 4x4 deal, entered the board with Tab, navigated and activated cards by keyboard, observed closed/revealed/matched names, verified turn and final-win live-region text in the DOM, left the board with Tab, and started another deal from the keyboard.

${names.map((snapshot, index) => `## Accessibility tree checkpoint ${index + 1}\n\n\`\`\`yaml\n${snapshot}\n\`\`\``).join("\n\n")}
`;
  const evidence = resolve("docs/evidence/keyboard-accessibility.md");
  await mkdir(dirname(evidence), { recursive: true });
  await writeFile(evidence, content, "utf8");
});

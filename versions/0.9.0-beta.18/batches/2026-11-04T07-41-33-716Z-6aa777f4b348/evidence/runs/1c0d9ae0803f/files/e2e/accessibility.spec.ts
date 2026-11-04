import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { cards, CODE_4, MATCHES } from "./helpers.ts";

async function moveTo(page: Page, from: number, to: number): Promise<number> {
  let current = from;
  let column = current % 4;
  const targetColumn = to % 4;
  while (column < targetColumn) { await page.keyboard.press("ArrowRight"); current += 1; column += 1; }
  while (column > targetColumn) { await page.keyboard.press("ArrowLeft"); current -= 1; column -= 1; }
  while (current < to) { await page.keyboard.press("ArrowDown"); current += 4; }
  while (current > to) { await page.keyboard.press("ArrowUp"); current -= 4; }
  await expect(cards(page).nth(to)).toBeFocused();
  return current;
}

test("full 4x4 keyboard and accessibility-tree journey", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.evaluate(() => document.activeElement === document.body)).resolves.toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: "Grid size" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("Board code").fill(CODE_4);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(cards(page)).toHaveCount(16);

  for (const _step of [0, 1, 2]) await page.keyboard.press("Shift+Tab");
  await expect(cards(page).nth(0)).toBeFocused();
  await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
  const stages: string[] = [];
  stages.push(`## Closed cards\n\n\`\`\`yaml\n${await page.locator("body").ariaSnapshot()}\n\`\`\``);
  await page.keyboard.press("Enter");
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /cyan solid plus, marker top, revealed$/);
  stages.push(`## First reveal\n\n\`\`\`yaml\n${await page.locator("body").ariaSnapshot()}\n\`\`\``);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
  await page.clock.runFor(800);

  let current = 1;
  for (const [first, second] of MATCHES) {
    current = await moveTo(page, current, first);
    await page.keyboard.press("Enter");
    current = await moveTo(page, current, second);
    await page.keyboard.press("Space");
    await expect(cards(page).nth(first)).toHaveAttribute("aria-disabled", "true");
  }
  await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
  await expect(page.getByText("Pairs: 8/8", { exact: true })).toBeVisible();
  await expect(page.getByText("Moves: 9", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Pair found. All pairs found in 9 moves and ");
  stages.push(`## Complete game\n\n\`\`\`yaml\n${await page.locator("body").ariaSnapshot()}\n\`\`\``);
  mkdirSync(resolve("artifacts"), { recursive: true });
  writeFileSync(resolve("artifacts/accessibility-journey.md"), `${stages.join("\n\n")}\n`);

  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  await expect(cards(page).nth(0)).toHaveAttribute("tabindex", "0");
});

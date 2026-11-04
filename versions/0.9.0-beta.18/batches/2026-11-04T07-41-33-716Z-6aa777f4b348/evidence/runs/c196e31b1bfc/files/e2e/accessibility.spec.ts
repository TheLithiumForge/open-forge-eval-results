import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { parseBoardCode } from "../src/game/boardCode.ts";
import { loadBoard, moveByArrows } from "./support.ts";

test("a complete 4x4 keyboard journey exposes useful names and one announcement region", async ({ page, browser }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await page.goto("/");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
  await expect(page.locator('[aria-live="polite"][aria-atomic="true"]')).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Grid size")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 0")).toBeVisible();

  await loadBoard(page, "np1-4-1");
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByRole("button", { name: "New Game" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Tab");
  const cards = page.locator(".memory-card");
  await expect(cards.nth(0)).toBeFocused();
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
  const treeBefore = await page.locator("main").ariaSnapshot();

  const board = parseBoardCode("np1-4-1");
  if (board === null) throw new Error("The documented board code must be valid.");
  const positions = new Map<number, number[]>();
  board.deck.forEach((face, index) => positions.set(face, [...(positions.get(face) ?? []), index]));
  let focused = 0;
  let moves = 0;
  for (const [face, pair] of positions) {
    const first = pair[0];
    const second = pair[1];
    if (first === undefined || second === undefined) throw new Error(`Face ${face} must occur twice.`);
    await moveByArrows(page, focused, first, 4);
    focused = first;
    await page.keyboard.press("Enter");
    if (moves === 0) {
      await expect(cards.nth(first)).toHaveAccessibleName(/revealed/);
      await expect(cards.nth(first)).toHaveAttribute("aria-pressed", "true");
    }
    await moveByArrows(page, focused, second, 4);
    focused = second;
    await page.keyboard.press("Enter");
    moves += 1;
    await expect(page.getByText(`Moves: ${moves}`)).toBeVisible();
    await expect(page.getByText(`Pairs: ${moves}/${positions.size}`)).toBeVisible();
    if (moves === 1) await expect(page.locator('[aria-live="polite"]')).toHaveText("Pair found. 1 pair matched.");
  }
  await expect(page.locator('[aria-live="polite"]')).toHaveText("Pair found. All pairs found in 8 moves and 0:00.");
  await expect(cards.nth(focused)).toHaveAttribute("aria-disabled", "true");
  const treeAfter = await page.locator("main").ariaSnapshot();
  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 0")).toBeVisible();

  await mkdir("artifacts", { recursive: true });
  const report = [
    "Neon Pairs 4x4 keyboard accessibility journey",
    `Browser: Chromium ${browser.version()}`,
    "Tool: Playwright Test 1.64.1",
    "Screen reader: not used; spoken output is confirmed during user acceptance.",
    "Journey: Grid size and New Game by name; native Tab into the board; reveal and match all pairs with arrows, Enter; receive one result per turn; inspect the completion, moves, and time; leave with Tab and start another game.",
    "\nAccessibility tree at the first card:\n",
    treeBefore,
    "\nAccessibility tree at completion:\n",
    treeAfter,
  ].join("\n");
  await writeFile("artifacts/accessibility-journey.txt", report);
});

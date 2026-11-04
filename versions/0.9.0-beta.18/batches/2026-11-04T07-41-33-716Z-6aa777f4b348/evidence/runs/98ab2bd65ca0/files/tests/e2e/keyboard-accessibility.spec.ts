import { expect, test } from "@playwright/test";
import { cardAt, loadBoard, pairsForCode } from "./helpers/game.ts";
import { saveJson } from "./helpers/evidence.ts";

async function moveFocus(page: import("@playwright/test").Page, from: number, to: number): Promise<void> {
  const width = 4;
  let row = Math.floor(from / width);
  let column = from % width;
  const targetRow = Math.floor(to / width);
  const targetColumn = to % width;
  while (column !== targetColumn) {
    const direction = column < targetColumn ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.press(direction);
    column += column < targetColumn ? 1 : -1;
  }
  while (row !== targetRow) {
    const direction = row < targetRow ? "ArrowDown" : "ArrowUp";
    await page.keyboard.press(direction);
    row += row < targetRow ? 1 : -1;
  }
}

test("complete the documented 4x4 keyboard and accessibility journey", async ({ page }, info) => {
  await page.goto("/");
  const sizeSelect = page.getByRole("combobox", { name: "Grid size" });
  const newGame = page.getByRole("button", { name: "New Game", exact: true });
  await expect(sizeSelect).toHaveValue("4");
  await newGame.focus();
  await page.keyboard.press("Enter");
  await loadBoard(page, "np1-4-1");

  await expect(page.locator(".reproduction-status")).toHaveText("");
  await page.getByRole("button", { name: "Restart", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(cardAt(page, 0)).toBeFocused();

  const initialTree = await page.locator("main").ariaSnapshot();
  await expect(cardAt(page, 15)).toHaveAttribute("aria-label", "Row 4, column 4, closed");
  await expect(cardAt(page, 15).locator("svg")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(cardAt(page, 0)).toBeFocused();
  await page.keyboard.press("Enter");
  const revealedTree = await page.locator("main").ariaSnapshot();
  await expect(cardAt(page, 0)).toHaveAttribute(
    "aria-label",
    "Row 1, column 1, cyan solid plus, marker top, revealed",
  );

  const live = page.locator('[aria-live="polite"]');
  const announcements: string[] = [];
  const pairs = pairsForCode("np1-4-1");
  const [, firstPartner] = pairs[0] ?? [];
  if (firstPartner === undefined) throw new Error("The literal board must contain a first pair.");
  await moveFocus(page, 0, firstPartner);
  await page.keyboard.press("Enter");
  announcements.push(await live.innerText());
  await expect(live).toHaveText("Pair found. 1 pair matched.");

  for (const [pairIndex, pair] of pairs.entries()) {
    if (pairIndex === 0) continue;
    const [first, second] = pair;
    const previous = pairIndex === 1 ? firstPartner : pairs[pairIndex - 1]?.[1];
    if (previous === undefined) throw new Error("Every earlier pair has two positions.");
    await moveFocus(page, previous, first);
    await page.keyboard.press("Enter");
    await moveFocus(page, first, second);
    await page.keyboard.press("Enter");
    announcements.push(await live.innerText());
    await expect(page.locator(".score-line")).toContainText(`Moves: ${pairIndex + 1}`);
  }

  await expect(live).toHaveCount(1);
  await expect(live).toHaveAttribute("aria-atomic", "true");
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  const finalText = await live.innerText();
  await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
  await expect(page.locator(".win-banner")).toContainText("Moves: 8");
  const finalTree = await page.locator("main").ariaSnapshot();
  await page.keyboard.press("Tab");
  await expect(page.locator("summary")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(cardAt(page, pairs[7]?.[1] ?? 0)).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Restart", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(newGame).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  await expect(page.locator(".card-button--matched")).toHaveCount(0);

  await saveJson("keyboard-journey.json", {
    node: process.versions.node,
    browser: await page.evaluate(() => navigator.userAgent),
    playwright: "1.64.1",
    project: info.project.name,
    checkpoints: { initialTree, revealedTree, finalTree },
    announcements,
    finalAnnouncement: finalText,
    nativeTabExitAndReturn: true,
    startedAnotherGame: true,
  });
});

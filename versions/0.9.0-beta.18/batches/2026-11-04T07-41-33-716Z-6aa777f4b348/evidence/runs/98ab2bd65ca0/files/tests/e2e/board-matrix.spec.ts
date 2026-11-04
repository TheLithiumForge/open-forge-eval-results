import { expect, test } from "@playwright/test";
import { cardAt, loadBoard, pairsForCode, solveWithPointer } from "./helpers/game.ts";
import { freezePageTime } from "./helpers/board.ts";

for (const size of [4, 6, 8, 10, 12, 14, 16]) {
  test(`finish a ${size}x${size} board with one move per pair`, async ({ page }) => {
    test.setTimeout(120000);
    await freezePageTime(page);
    await page.goto("/");
    const boardCode = `np1-${size}-1`;
    await loadBoard(page, boardCode);
    const pairs = pairsForCode(boardCode);
    await expect(page.locator(".card-button")).toHaveCount(size * size);
    await solveWithPointer(page, boardCode);
    await expect(page.locator(".card-button--matched")).toHaveCount(size * size);
    await expect(page.locator(".score-line")).toContainText(`Moves: ${pairs.length}`);
    await expect(page.locator(".score-line")).toContainText(`Pairs: ${pairs.length}/${pairs.length}`);
    await expect(page.locator(".win-banner")).toContainText(`Moves: ${pairs.length}`);
    await expect(cardAt(page, size * size - 1)).toHaveAttribute("aria-disabled", "true");
  });
}

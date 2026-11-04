import { expect, test } from "@playwright/test";
import { cardAt, loadBoard, pairsForCode } from "./helpers/game.ts";
import { freezePageTime } from "./helpers/board.ts";

async function waitPastOldDeadline(page: import("@playwright/test").Page): Promise<void> {
  await page.clock.runFor(900);
}

async function checkFreshSelection(page: import("@playwright/test").Page): Promise<void> {
  await cardAt(page, 0).click();
  await waitPastOldDeadline(page);
  await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  const boardCode = await page.getByLabel("Board code").inputValue();
  const pair = pairsForCode(boardCode).find(([first, second]) => first === 0 || second === 0);
  if (pair === undefined) throw new Error("Position zero has one documented pair.");
  const partner = pair[0] === 0 ? pair[1] : pair[0];
  await cardAt(page, partner).click();
  await expect(page.locator(".score-line")).toContainText("Pairs: 1/8");
}

test("restart and start another game during a miss without stale timer updates", async ({ page }) => {
  await freezePageTime(page);
  await page.goto("/");
  await loadBoard(page, "np1-4-1");
  await cardAt(page, 1).click();
  await cardAt(page, 2).click();
  await page.clock.runFor(250);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  await expect(page.locator(".card-button--face")).toHaveCount(0);
  await checkFreshSelection(page);

  await cardAt(page, 1).click();
  await cardAt(page, 2).click();
  await page.clock.runFor(250);
  await page.getByRole("button", { name: "New Game", exact: true }).click();
  await expect(page.locator(".score-line")).toContainText("Moves: 0");
  await expect(page.getByLabel("Board code")).not.toHaveValue("np1-4-1");
  await checkFreshSelection(page);
});

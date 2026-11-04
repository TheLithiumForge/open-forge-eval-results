import { expect, test } from "@playwright/test";
import { startDeal } from "./support.ts";

test("repeated selections, immediate matches, misses and announcements follow turn rules", async ({ page }) => {
  await page.goto("/");
  await startDeal(page, "np1-4-1");
  const cards = page.locator(".memory-card");
  const status = page.getByRole("status");

  await cards.nth(0).click();
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await cards.nth(0).click();
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");
  await cards.nth(11).click();
  await expect(cards.nth(11)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(".score-strip")).toContainText("Pairs: 1/8");
  await expect(status).toHaveText("Pair found. 1 pair matched.");

  await cards.nth(1).click();
  await cards.nth(2).click();
  await expect(page.locator(".score-strip")).toContainText("Moves: 2");
  await expect(status).toHaveText("No match. Cards close after a short pause.");
  await cards.nth(3).click();
  await expect(page.locator(".score-strip")).toContainText("Moves: 2");
  const firstMiss = await status.locator("span").elementHandle();
  if (firstMiss === null) throw new Error("The first miss must have a live announcement node.");
  await page.waitForTimeout(850);
  await expect(cards.nth(1)).toHaveAccessibleName("Row 1, column 2, closed");
  await expect(status).toHaveText("No match. Cards close after a short pause.");
  expect(await firstMiss.evaluate((element) => element.isConnected)).toBe(true);

  await cards.nth(1).click();
  await cards.nth(2).click();
  await expect(status).toHaveText("No match. Cards close after a short pause.");
  const secondMiss = await status.locator("span").elementHandle();
  if (secondMiss === null) throw new Error("The second miss must have a live announcement node.");
  expect(await firstMiss.evaluate((element) => element.isConnected)).toBe(false);
  expect(await secondMiss.evaluate((element) => element.isConnected)).toBe(true);
  await page.waitForTimeout(850);
  await expect(page.locator(".score-strip")).toContainText("Moves: 3");
});

test("board codes are exact, drafts persist through play and replacements reset only the board", async ({ page }) => {
  await page.goto("/");
  const details = page.locator("details");
  await expect(details).not.toHaveAttribute("open", "");
  await expect(page.getByLabel("Grid size").locator("option")).toHaveText([
    "4x4", "6x6", "8x8", "10x10", "12x12", "14x14", "16x16"
  ]);
  await expect(page.getByLabel("Board code")).toHaveAttribute("maxLength", "32");
  await expect(page.getByLabel("Snapshot JSON")).toHaveAttribute("maxLength", "65536");
  await startDeal(page, "  np1-4-1  ");
  const load = page.getByRole("button", { name: "Load board", exact: true });
  await expect(load).toBeFocused();
  await expect(page.getByLabel("Board code")).toHaveValue("np1-4-1");

  const draft = page.getByLabel("Board code", { exact: true });
  await draft.fill("this-draft-stays");
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  await expect(draft).toHaveValue("this-draft-stays");
  await draft.fill("np1-4-01");
  await load.click();
  await expect(page.locator(".reproduction-status")).toHaveText("Invalid board code.");
  await expect(draft).toHaveValue("np1-4-01");
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");

  await draft.fill("np1-4-1");
  await load.click();
  await cards.nth(0).click();
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
  await expect(page.getByLabel("Board code")).toHaveValue("np1-4-1");
  await page.getByRole("button", { name: "New Game", exact: true }).click();
  await expect(page.getByLabel("Board code")).not.toHaveValue("np1-4-1");
  await page.getByLabel("Grid size", { exact: true }).selectOption("16");
  await expect(page.locator(".memory-card")).toHaveCount(256);
});

test("invalid snapshot drafts keep the live game and focus the load control", async ({ page }) => {
  await page.goto("/");
  await startDeal(page, "np1-4-1");
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  const draft = page.getByLabel("Snapshot JSON", { exact: true });
  await draft.fill("not JSON");
  const load = page.getByRole("button", { name: "Load snapshot", exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(page.locator(".reproduction-status")).toHaveText("Invalid snapshot.");
  await expect(draft).toHaveValue("not JSON");
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await cards.nth(11).click();
  await expect(page.locator(".score-strip")).toContainText("Pairs: 1/8");
  await expect(page.locator(".score-strip")).toContainText("Moves: 1");
});

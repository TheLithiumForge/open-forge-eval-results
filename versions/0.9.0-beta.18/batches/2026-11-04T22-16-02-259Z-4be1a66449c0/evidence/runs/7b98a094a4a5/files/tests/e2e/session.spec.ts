import { expect, test, type Page } from "@playwright/test";

test("restart cancels an old mismatch timer before a new turn", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await page.getByRole("button", { name: "Row 1, column 2, closed" }).click();
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  const firstMismatchTime = await page.evaluate(() => performance.now());
  await page.waitForTimeout(150);

  await page.getByRole("button", { name: "Restart" }).click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  const secondMismatchTime = await page.evaluate(() => performance.now());

  const waitPastOldDeadline = Math.max(1, Math.ceil(firstMismatchTime + 850 - secondMismatchTime));
  expect(waitPastOldDeadline).toBeLessThan(800);
  await page.waitForTimeout(waitPastOldDeadline);
  await expect(page.getByRole("button", { name: /Row 1, column 1, .* revealed/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible({ timeout: 500 });
});


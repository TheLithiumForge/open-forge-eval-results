import { expect, test } from "@playwright/test";

test("page visibility pauses the clock and mismatch countdown", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game").click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await page.getByRole("button", { name: "Row 1, column 2, closed" }).click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  const revealedFirst = page.getByRole("button", { name: /Row 1, column 1, .*revealed/ });
  const revealedSecond = page.getByRole("button", { name: /Row 1, column 2, .*revealed/ });
  await page.waitForTimeout(200);
  await page.evaluate(`Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange"));`);
  await page.waitForTimeout(900);
  await expect(revealedFirst).toBeVisible();
  await expect(revealedSecond).toBeVisible();
  await expect(page.getByText("Time: 0:00")).toBeVisible();

  await page.evaluate(`Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); document.dispatchEvent(new Event("visibilitychange"));`);
  await page.waitForTimeout(650);
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Row 1, column 2, closed" })).toBeVisible();
});

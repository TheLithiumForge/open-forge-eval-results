import { expect, test } from "@playwright/test";

test("saves loaded board size across a local HTTP reload and preserves unrelated storage", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("keep-me", "unchanged"));
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-6-17");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  expect(await page.evaluate(() => localStorage.getItem("keep-me"))).toBe("unchanged");
  expect(await page.getByRole("button", { name: "Row 1, column 1, closed" }).count()).toBe(1);
});

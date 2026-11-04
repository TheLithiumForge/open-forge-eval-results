import { expect, test, type Page } from "@playwright/test";

const PAIRS = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;

test("keeps a better score and preserves equal and worse results across reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("neonPairs.best.v1", '{"version":1,"scores":{"4":10}}');
  });
  await page.reload();
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();

  await startKeyboardBoard(page);
  await solvePairs(page, 0);
  await expect(page.getByText(/Best:/)).toContainText("8");

  await page.getByRole("button", { name: "Restart" }).click();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeFocused();
  await solvePairs(page, 0);
  await expect(page.getByText(/Best:/)).toContainText("8");

  await page.getByRole("button", { name: "Restart" }).click();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible({ timeout: 1_500 });
  await expect(page.getByRole("button", { name: "Row 1, column 2, closed" })).toBeFocused();
  await solvePairs(page, 1);
  await expect(page.getByText(/Pairs:/)).toContainText("8/8");
  await expect(page.getByText(/Moves:/)).toContainText("9");
  await expect(page.getByText(/Best:/)).toContainText("8");

  await page.reload();
  await expect(page.getByText(/Best:/)).toContainText("8");
});

async function startKeyboardBoard(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Restart" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeFocused();
}

async function solvePairs(page: Page, start: number): Promise<void> {
  let current = start;
  for (const [first, second] of PAIRS) {
    current = await focusPosition(page, current, first);
    await page.keyboard.press("Enter");
    current = await focusPosition(page, current, second);
    await page.keyboard.press("Enter");
  }
}

async function focusPosition(page: Page, from: number, to: number): Promise<number> {
  let current = from;
  while (Math.floor(current / 4) > Math.floor(to / 4)) {
    await page.keyboard.press("ArrowUp");
    current -= 4;
  }
  while (Math.floor(current / 4) < Math.floor(to / 4)) {
    await page.keyboard.press("ArrowDown");
    current += 4;
  }
  while (current % 4 > to % 4) {
    await page.keyboard.press("ArrowLeft");
    current -= 1;
  }
  while (current % 4 < to % 4) {
    await page.keyboard.press("ArrowRight");
    current += 1;
  }
  return current;
}

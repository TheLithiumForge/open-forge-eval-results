import { expect, test, type Page } from "@playwright/test";

async function loadSeedOne(page: Page): Promise<void> {
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".load-status")).toHaveText("Loaded board np1-4-1.");
}

async function moveFocus(page: Page, from: number, to: number): Promise<void> {
  const size = 4;
  const fromRow = Math.floor(from / size);
  const toRow = Math.floor(to / size);
  const fromColumn = from % size;
  const toColumn = to % size;
  for (let row = fromRow; row < toRow; row += 1) await page.keyboard.press("ArrowDown");
  for (let row = fromRow; row > toRow; row -= 1) await page.keyboard.press("ArrowUp");
  for (let column = fromColumn; column < toColumn; column += 1) await page.keyboard.press("ArrowRight");
  for (let column = fromColumn; column > toColumn; column -= 1) await page.keyboard.press("ArrowLeft");
}

test("plays a complete 4x4 game with keyboard and exposes its accessible board", async ({ page }) => {
  await page.goto("/");
  await loadSeedOne(page);
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
  await page.getByLabel("Grid size").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const board = page.getByRole("group", { name: "Card board" });
  const tree = await board.ariaSnapshot();
  expect(tree).toContain('button "Row 1, column 1, closed"');
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeFocused();

  const pairs: ReadonlyArray<readonly [number, number]> = [
    [0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13],
  ];
  let position = 0;
  for (const [first, second] of pairs) {
    await moveFocus(page, position, first);
    await page.keyboard.press("Space");
    await moveFocus(page, first, second);
    await page.keyboard.press("Space");
    position = second;
  }
  await expect(page.getByText("Pairs: 8/8")).toBeVisible();
  await expect(page.getByText("Best: 8")).toBeVisible();
  await expect(page.getByRole("region", { name: "Game complete" })).toContainText("8 moves in");
  await expect(page.getByRole("status")).toContainText("All pairs found in 8 moves and");
  await page.reload();
  await expect(page.getByText("Best: 8")).toBeVisible();
});

test("board codes, misses and Restart isolate earlier timer work", async ({ page }) => {
  await page.goto("/");
  await loadSeedOne(page);
  const cards = page.getByRole("group", { name: "Card board" }).getByRole("button");
  const first = cards.nth(0);
  const second = page.getByRole("button", { name: "Row 1, column 2, closed" });
  await first.click();
  await expect(first).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await second.click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");

  await page.getByRole("button", { name: "Restart" }).click();
  const restarted = page.getByRole("group", { name: "Card board" }).getByRole("button").nth(0);
  await restarted.click();
  await page.waitForTimeout(850);
  await expect(restarted).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await expect(page.getByText("Moves: 0")).toBeVisible();
});

test("snapshot import pauses, Resume focuses the board, and export captures progress", async ({ page }) => {
  await page.goto("/");
  await loadSeedOne(page);
  const snapshot = JSON.stringify({
    version: 1, boardCode: "np1-4-1", matched: [],
    selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 300 },
    moves: 1, elapsedMs: 500, started: true,
  });
  await page.getByLabel("Snapshot JSON").fill(snapshot);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".load-status")).toHaveText("Loaded snapshot. Select Resume to continue.");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  const first = page.getByRole("group", { name: "Card board" }).getByRole("button").nth(0);
  await expect(first).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await first.click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(first).toBeFocused();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(first).toHaveAccessibleName("Row 1, column 1, closed", { timeout: 1_000 });

  await page.getByRole("button", { name: "Export snapshot" }).click();
  const exported: unknown = JSON.parse(await page.getByLabel("Snapshot JSON").inputValue());
  expect(exported).toMatchObject({ version: 1, boardCode: "np1-4-1", moves: 1 });
});


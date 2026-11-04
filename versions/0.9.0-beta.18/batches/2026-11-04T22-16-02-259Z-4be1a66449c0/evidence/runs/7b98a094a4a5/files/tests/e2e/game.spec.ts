import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DOCUMENTED_PAIRS = [
  [0, 11],
  [1, 9],
  [2, 6],
  [3, 7],
  [4, 5],
  [8, 15],
  [10, 14],
  [12, 13],
] as const;

test("plays a full 4x4 game by keyboard with a useful accessibility tree", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();

  await loadDocumentedBoard(page);
  const first = page.getByRole("button", { name: "Row 1, column 1, closed" });
  await page.getByRole("button", { name: "Restart" }).focus();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();

  const initialTree = await page.locator("main").ariaSnapshot();
  expect(initialTree).toContain("Grid size");
  expect(initialTree).toContain("Row 1, column 1, closed");
  expect(initialTree).toContain("Game board");
  await testInfo.attach("initial-accessibility-tree", {
    body: initialTree,
    contentType: "text/plain",
  });
  await saveTree(testInfo.outputPath("initial-accessibility-tree.txt"), initialTree);

  let position = 0;
  for (const [left, right] of DOCUMENTED_PAIRS) {
    position = await focusPosition(page, position, left);
    await page.keyboard.press("Enter");
    position = await focusPosition(page, position, right);
    await page.keyboard.press("Enter");
  }

  await expect(page.getByText(/Pairs:/)).toContainText("8/8");
  await expect(page.getByText(/Game complete\. 8 moves in 0:\d{2}\./)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("All pairs found in 8 moves");
  const completedTree = await page.locator("main").ariaSnapshot();
  expect(completedTree).toContain("Game complete. 8 moves in");
  expect(completedTree).toContain("All pairs found in 8 moves");
  await testInfo.attach("completed-accessibility-tree", {
    body: completedTree,
    contentType: "text/plain",
  });
  await saveTree(testInfo.outputPath("completed-accessibility-tree.txt"), completedTree);
  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
});

test("holds a mismatch for active time and resumes a paused snapshot", async ({ page }) => {
  await page.goto("/");
  await loadDocumentedBoard(page);
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await page.getByRole("button", { name: "Row 1, column 2, closed" }).click();
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  await expect(page.getByRole("button", { name: "Row 1, column 1, cyan solid plus, marker top, revealed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible({ timeout: 1_500 });

  const snapshot =
    '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
  await page.getByLabel("Snapshot JSON").fill(snapshot);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".reproduction-status")).toHaveText("Loaded snapshot. Select Resume to continue.");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.waitForTimeout(450);
  await expect(page.getByRole("button", { name: /Row 1, column 2, .* revealed/ })).toBeVisible();

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Row 1, column 1, cyan solid plus, marker top, matched" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Row 1, column 2, closed" })).toBeVisible({ timeout: 1_000 });
});

test("remembers size on the HTTP origin and keeps 16x16 inside the board", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByLabel("Grid size").selectOption("6");
  await expect(page.getByRole("button", { name: /^Row/ })).toHaveCount(36);
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");

  await page.getByLabel("Grid size").selectOption("16");
  const cards = page.getByRole("button", { name: /^Row/ });
  await expect(cards).toHaveCount(256);
  await expect(page.getByRole("button", { name: "Row 16, column 16, closed" })).toBeVisible();
  const firstCard = await page.getByRole("button", { name: "Row 1, column 1, closed" }).boundingBox();
  expect(firstCard?.width).toBeGreaterThanOrEqual(44);
  const dimensions = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    boardWidth: document.querySelector(".board-scroll")?.clientWidth ?? 0,
    boardScrollWidth: document.querySelector(".board-scroll")?.scrollWidth ?? 0,
  }));
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.boardScrollWidth).toBeGreaterThan(dimensions.boardWidth);

  const firstLargeCard = page.getByRole("button", { name: "Row 1, column 1, closed" });
  await firstLargeCard.focus();
  await focusPosition(page, 0, 255, 16);
  const last = page.getByRole("button", { name: "Row 16, column 16, closed" });
  await expect(last).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});

test("keeps controls and both board sizes readable at a zoom-equivalent viewport", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByLabel("Grid size")).toBeVisible();
  await expect(page.getByText(/Moves:/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Row/ })).toHaveCount(16);
  await page.getByLabel("Grid size").selectOption("16");
  await expect(page.getByRole("button", { name: /^Row/ })).toHaveCount(256);
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).focus();
  await focusPosition(page, 0, 255, 16);
  await expect(page.getByRole("button", { name: "Row 16, column 16, closed" })).toBeFocused();
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
  await context.close();
});

test("opens the generated distribution from disk without network assets", async ({ browser }) => {
  const context = await browser.newContext();
  await context.route("https://**/*", (route) => route.abort());
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  await expect(page).toHaveTitle("Neon Pairs");
  await expect(page.getByRole("button", { name: /^Row/ })).toHaveCount(16);
  const externalResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").filter((entry) => /^https?:/.test(entry.name)).length,
  );
  expect(externalResources).toBe(0);
  await context.close();
});

async function loadDocumentedBoard(page: Page): Promise<void> {
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".reproduction-status")).toHaveText("Loaded board.");
}

async function focusPosition(page: Page, from: number, to: number, columns = 4): Promise<number> {
  let current = from;
  while (Math.floor(current / columns) > Math.floor(to / columns)) {
    await page.keyboard.press("ArrowUp");
    current -= columns;
  }
  while (Math.floor(current / columns) < Math.floor(to / columns)) {
    await page.keyboard.press("ArrowDown");
    current += columns;
  }
  while (current % columns > to % columns) {
    await page.keyboard.press("ArrowLeft");
    current -= 1;
  }
  while (current % columns < to % columns) {
    await page.keyboard.press("ArrowRight");
    current += 1;
  }
  return current;
}

async function saveTree(path: string, tree: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, tree, "utf8");
}

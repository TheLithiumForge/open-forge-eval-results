import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const pairs = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;

async function openReproduction(page: import("@playwright/test").Page) {
  const panel = page.locator("details");
  if (!(await panel.evaluate((node) => node.getAttribute("open") !== null))) await panel.locator("summary").click();
  return panel;
}

async function loadKnownBoard(page: import("@playwright/test").Page) {
  const panel = await openReproduction(page);
  await panel.getByLabel("Board code").fill("np1-4-1");
  await panel.getByRole("button", { name: "Load board" }).click();
  return panel;
}

async function moveByKeyboard(page: import("@playwright/test").Page, from: number, to: number) {
  const side = 4;
  let row = Math.floor(from / side);
  let column = from % side;
  const targetRow = Math.floor(to / side);
  const targetColumn = to % side;
  while (row > targetRow) { await page.keyboard.press("ArrowUp"); row -= 1; }
  while (row < targetRow) { await page.keyboard.press("ArrowDown"); row += 1; }
  while (column > targetColumn) { await page.keyboard.press("ArrowLeft"); column -= 1; }
  while (column < targetColumn) { await page.keyboard.press("ArrowRight"); column += 1; }
}

test("offline HTML opens from disk without a network dependency", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.route("https://**", (route) => route.abort());
  const file = pathToFileURL(resolve(process.cwd(), "dist/index.html")).href;
  await page.goto(file);
  await expect(page).toHaveTitle("Neon Pairs");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
  await expect(page.locator(".game-card")).toHaveCount(16);
  expect(requested.every((url) => url.startsWith("file://"))).toBe(true);
});

test("keyboard and accessible tree support a complete documented 4x4 game", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
  const panel = await loadKnownBoard(page);
  await panel.locator("summary").click();
  await page.keyboard.press("Shift+Tab");
  const first = page.getByRole("button", { name: "Row 1, column 1, closed" });
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Row 1, column 1, cyan solid plus, marker top, revealed" })).toBeFocused();
  const firstRevealTree = await page.getByRole("main").ariaSnapshot();
  expect(firstRevealTree).toContain('button "Row 1, column 1, cyan solid plus, marker top, revealed"');
  expect(firstRevealTree).toContain('button "Row 1, column 2, closed"');

  let current = 0;
  for (const [firstIndex, secondIndex] of pairs) {
    if (firstIndex !== current) {
      await moveByKeyboard(page, current, firstIndex);
      await page.keyboard.press("Enter");
    }
    await moveByKeyboard(page, firstIndex, secondIndex);
    await page.keyboard.press("Enter");
    current = secondIndex;
  }
  await expect(page.locator(".win-banner")).toContainText("Finished in 8 moves and");
  await expect(page.getByRole("status")).toContainText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  const completedTree = await page.getByRole("main").ariaSnapshot();
  expect(completedTree).toContain("matched");
  expect(completedTree).toContain('button "Row 1, column 1, cyan solid plus, marker top, matched"');
  await mkdir(resolve(process.cwd(), "evidence"), { recursive: true });
  await writeFile(resolve(process.cwd(), "evidence/keyboard-journey.aria.txt"), `Browser: ${page.context().browser()?.version()}\n\nFirst reveal:\n${firstRevealTree}\n\nCompleted game:\n${completedTree}\n`);
});

test("restart invalidates an earlier mismatch and active timeout closes a miss", async ({ page }) => {
  await page.goto("/");
  await loadKnownBoard(page);
  const cards = page.locator(".game-card");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.locator(".game-status")).toContainText(/Moves:\s*0/);
  await page.waitForTimeout(900);
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();

  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.waitForTimeout(900);
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Row 1, column 2, closed" })).toBeVisible();
});

test("unfinished snapshot remains paused until Resume and continues its remaining mismatch time", async ({ page }) => {
  await page.goto("/");
  const panel = await openReproduction(page);
  const snapshot = { version: 1, boardCode: "np1-4-1", matched: [0, 11], selection: { kind: "mismatch", first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true };
  await panel.getByLabel("Snapshot JSON").fill(JSON.stringify(snapshot));
  await panel.getByRole("button", { name: "Load snapshot" }).click();
  await expect(panel.getByText("Loaded snapshot. Select Resume to continue.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Row 1, column 2, .* revealed/ })).toBeVisible();
  await page.waitForTimeout(450);
  await expect(page.getByRole("button", { name: /Row 1, column 2, .* revealed/ })).toBeVisible();
  await panel.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Row 1, column 1, cyan solid plus, marker top, matched" })).toBeFocused();
  await page.waitForTimeout(400);
  await expect(page.getByRole("button", { name: "Row 1, column 2, closed" })).toBeVisible();
});

test("served preferences and best moves survive reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".game-status")).toContainText("Best: none");
  await page.getByLabel("Grid size").selectOption("6");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await page.getByLabel("Grid size").selectOption("4");
  await loadKnownBoard(page);
  const cards = page.locator(".game-card");
  for (const [first, second] of pairs) {
    await cards.nth(first).click();
    await cards.nth(second).click();
  }
  await expect(page.locator(".game-status")).toContainText(/Best:\s*8/);
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.locator(".game-status")).toContainText(/Best:\s*8/);
  await page.reload();
  await expect(page.locator(".game-status")).toContainText(/Best:\s*8/);
});

test("16x16 boards stay inside the page and keep focused outlines visible at required viewports", async ({ browser }) => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByLabel("Grid size").selectOption("16");
    const cards = page.locator(".game-card");
    await expect(cards).toHaveCount(256);
    await page.waitForFunction(() => (document.querySelector(".game-card")?.getBoundingClientRect().width ?? 0) >= 44);
    const layout = await page.evaluate(() => {
      const area = document.querySelector(".board-scroll")!;
      const firstCard = document.querySelector(".game-card")!;
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        cardWidth: firstCard.getBoundingClientRect().width,
        boardScrollWidth: area.scrollWidth,
        boardClientWidth: area.clientWidth,
      };
    });
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(44);
    if (viewport.width === 360) expect(layout.boardScrollWidth).toBeGreaterThan(layout.boardClientWidth);
    await cards.nth(0).focus();
    for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowRight");
    for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowDown");
    await expect(cards.nth(255)).toBeFocused();
    const outline = await page.evaluate(() => {
      const area = document.querySelector(".board-scroll")!;
      const card = document.activeElement!;
      const areaRect = area.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const left = areaRect.left + area.clientLeft;
      const top = areaRect.top + area.clientTop;
      return {
        leftVisible: cardRect.left - 5 >= left,
        rightVisible: cardRect.right + 5 <= left + area.clientWidth,
        topVisible: cardRect.top - 5 >= top,
        bottomVisible: cardRect.bottom + 5 <= top + area.clientHeight,
      };
    });
    expect(outline).toEqual({ leftVisible: true, rightVisible: true, topVisible: true, bottomVisible: true });
    await page.getByRole("button", { name: "New Game" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
    await context.close();
  }

  const zoomContext = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto("/");
  for (const size of [4, 16]) {
    await zoomPage.getByLabel("Grid size").selectOption(String(size));
    await expect(zoomPage.locator(".game-card")).toHaveCount(size * size);
    const pageWidth = await zoomPage.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(640);
  }
  await zoomContext.close();
});

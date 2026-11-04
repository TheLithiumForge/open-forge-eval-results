import { expect, test, type Locator, type Page } from "@playwright/test";
import { cardAt, completedSnapshot, loadBoard } from "./helpers/game.ts";
import { moveFocusWithArrows } from "./helpers/board.ts";
import { saveScreenshot } from "./helpers/evidence.ts";

async function focusBox(card: Locator, board: Locator): Promise<void> {
  const cardBox = await card.boundingBox();
  const boardBox = await board.boundingBox();
  if (cardBox === null || boardBox === null) throw new Error("Expected visible board geometry.");
  expect(cardBox.width).toBeGreaterThanOrEqual(44);
  expect(cardBox.height).toBeGreaterThanOrEqual(44);
  expect(cardBox.x - 5).toBeGreaterThanOrEqual(boardBox.x);
  expect(cardBox.y - 5).toBeGreaterThanOrEqual(boardBox.y);
  expect(cardBox.x + cardBox.width + 5).toBeLessThanOrEqual(boardBox.x + boardBox.width);
  expect(cardBox.y + cardBox.height + 5).toBeLessThanOrEqual(boardBox.y + boardBox.height);
}

async function largeBoard(page: Page): Promise<void> {
  await page.getByLabel("Grid size").selectOption("16");
  await expect(page.locator(".card-button")).toHaveCount(256);
}

test("fit desktop and mobile 16x16 boards, focus the full outline, and scroll by keyboard", async ({ page }) => {
  await page.goto("/");
  await saveScreenshot(page, "layout-desktop-1280x800-4x4.png");
  await page.setViewportSize({ width: 1280, height: 800 });
  await largeBoard(page);
  await saveScreenshot(page, "layout-desktop-1280x800-16x16.png");
  const desktopWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(desktopWidth).toBeLessThanOrEqual(1280);

  await page.setViewportSize({ width: 360, height: 800 });
  await largeBoard(page);
  await saveScreenshot(page, "layout-mobile-360x800-16x16.png");
  const mobile = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    cards: document.querySelectorAll(".card-button").length,
    cardWidth: document.querySelector(".card-button")?.getBoundingClientRect().width ?? 0,
    boardWidth: document.querySelector(".board-scroll")?.clientWidth ?? 0,
    gridWidth: document.querySelector(".board-grid")?.scrollWidth ?? 0,
  }));
  expect(mobile.pageWidth).toBe(360);
  expect(mobile.cards).toBe(256);
  expect(mobile.cardWidth).toBe(44);
  expect(mobile.boardWidth).toBeLessThan(mobile.gridWidth);

  await page.getByRole("button", { name: "Restart", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(cardAt(page, 0)).toBeFocused();
  const board = page.locator(".board-scroll");
  await focusBox(cardAt(page, 0), board);
  await moveFocusWithArrows(page, 16, 0, 120);
  await expect(cardAt(page, 120)).toBeFocused();
  await focusBox(cardAt(page, 120), board);
  await moveFocusWithArrows(page, 16, 120, 255);
  await expect(cardAt(page, 255)).toBeFocused();
  await focusBox(cardAt(page, 255), board);
  const scroll = await board.evaluate((element) => ({
    left: element.scrollLeft,
    top: element.scrollTop,
  }));
  expect(scroll.left).toBeGreaterThan(0);
  expect(scroll.top).toBeGreaterThan(0);
});

test("keep a 16x16 board inside the 640x400 zoom-equivalent viewport", async ({ browser }) => {
  const zoom = await browser.newPage({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
  });
  await zoom.goto("http://127.0.0.1:4173");
  await largeBoard(zoom);
  await saveScreenshot(zoom, "layout-zoom-640x400-dpr2-16x16.png");
  const widths = await zoom.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    cards: document.querySelectorAll(".card-button").length,
  }));
  expect(widths.page).toBe(640);
  expect(widths.cards).toBe(256);
  const board = zoom.locator(".board-scroll");
  await zoom.getByRole("button", { name: "Restart", exact: true }).focus();
  await zoom.keyboard.press("Tab");
  await expect(cardAt(zoom, 0)).toBeFocused();
  await focusBox(cardAt(zoom, 0), board);
  await moveFocusWithArrows(zoom, 16, 0, 120);
  await focusBox(cardAt(zoom, 120), board);
  await moveFocusWithArrows(zoom, 16, 120, 255);
  await expect(cardAt(zoom, 255)).toBeFocused();
  await focusBox(cardAt(zoom, 255), board);

  await zoom.getByLabel("Grid size").selectOption("4");
  await loadBoard(zoom, "np1-4-1");
  await zoom.getByText("Reproduce a game", { exact: true }).click();
  await zoom.getByRole("button", { name: "Restart", exact: true }).focus();
  await zoom.keyboard.press("Tab");
  await expect(cardAt(zoom, 0)).toBeFocused();
  const completed = completedSnapshot("np1-4-1");
  await zoom.getByText("Reproduce a game", { exact: true }).click();
  await zoom.getByLabel("Snapshot JSON").fill(completed);
  await zoom.getByRole("button", { name: "Load snapshot", exact: true }).click();
  await expect(zoom.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
  await saveScreenshot(zoom, "layout-zoom-640x400-dpr2-4x4-win.png");
  await expect(zoom.getByRole("button", { name: "New Game" })).toBeVisible();
  await expect(zoom.getByText("Reproduce a game", { exact: true })).toBeVisible();
  await zoom.close();
});

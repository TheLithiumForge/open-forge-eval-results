import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { cardButtons, completedSnapshot, loadBoard, loadSnapshot } from "./support.ts";

async function zoomPage(browser: Browser) {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
  });
  return { context, page: await context.newPage() };
}

test("plays 4x4 and reads the win summary at the 200% equivalent layout", async ({ browser }) => {
  const { context, page } = await zoomPage(browser);
  try {
    await mkdir(resolve("evidence"), { recursive: true });
    await page.goto("/");
    await loadBoard(page, "np1-4-1");
    const first = cardButtons(page).nth(0);
    await first.click();
    await first.press("ArrowRight");
    await expect(cardButtons(page).nth(1)).toBeFocused();
    await cardButtons(page).nth(11).click();
    await expect(page.getByText("Moves: 1")).toBeVisible();
    await expect(page.getByLabel("Grid size")).toBeVisible();
    await expect(page.getByText("Pairs: 1/8")).toBeVisible();

    await loadSnapshot(page, completedSnapshot("np1-4-1", 60_000));
    const banner = page.locator(".win-banner");
    await expect(banner).toContainText("8 moves");
    await page.screenshot({ path: "evidence/layout-zoom-4x4-640x400-dsf2.png", fullPage: true });
    await banner.scrollIntoViewIfNeeded();
    const report = await page.evaluate(() => {
      const selectors = [".game-controls", ".board-scroll", ".win-banner"];
      const boxes = selectors.map((selector) => {
        const item = document.querySelector(selector);
        if (item === null) return null;
        const box = item.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      });
      return { viewport: window.innerWidth, page: document.documentElement.scrollWidth, boxes };
    });
    expect(report.page).toBeLessThanOrEqual(640);
    expect(report.boxes).toHaveLength(3);
    const [controls, board, bannerBox] = report.boxes;
    expect(controls).not.toBeNull();
    expect(board).not.toBeNull();
    expect(bannerBox).not.toBeNull();
    if (controls && board && bannerBox) {
      expect(controls.bottom).toBeLessThanOrEqual(board.top);
      expect(board.bottom).toBeLessThanOrEqual(bannerBox.top);
      expect(bannerBox.right).toBeLessThanOrEqual(report.viewport);
    }
  } finally {
    await context.close();
  }
});

test("keeps a scrollable 16x16 playable with pointer and keyboard at 200% equivalent", async ({ browser }) => {
  const { context, page } = await zoomPage(browser);
  try {
    await mkdir(resolve("evidence"), { recursive: true });
    await page.goto("/");
    await loadBoard(page, "np1-16-1");
    await expect(cardButtons(page)).toHaveCount(256);
    const geometry = await page.evaluate(() => {
      const board = document.querySelector(".board-scroll");
      const card = document.querySelector(".board-grid > button.card");
      if (board === null || !(card instanceof HTMLElement)) return null;
      const box = card.getBoundingClientRect();
      return { width: box.width, height: box.height, overflowX: board.scrollWidth > board.clientWidth };
    });
    expect(geometry).not.toBeNull();
    expect(geometry?.width).toBeGreaterThanOrEqual(44);
    expect(geometry?.width).toBe(geometry?.height);
    expect(geometry?.overflowX).toBe(true);
    await cardButtons(page).nth(0).click();
    await expect(cardButtons(page).nth(0)).toBeFocused();
    for (let index = 0; index < 8; index += 1) await page.keyboard.press("ArrowRight");
    for (let index = 0; index < 8; index += 1) await page.keyboard.press("ArrowDown");
    await expect(cardButtons(page).nth(136)).toBeFocused();
    await expect(await cardButtons(page).nth(136).evaluate((card) => {
      const box = card.getBoundingClientRect();
      const board = card.closest(".board-scroll");
      if (!(board instanceof HTMLElement)) return false;
      const area = board.getBoundingClientRect();
      const style = getComputedStyle(card);
      const extent = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
      return card.matches(":focus-visible") && box.left - extent >= area.left
        && box.right + extent <= area.right && box.top - extent >= area.top && box.bottom + extent <= area.bottom;
    })).toBe(true);
    for (let index = 0; index < 7; index += 1) await page.keyboard.press("ArrowDown");
    for (let index = 0; index < 7; index += 1) await page.keyboard.press("ArrowRight");
    await expect(cardButtons(page).nth(255)).toBeFocused();
    const lastOutlineVisible = await cardButtons(page).nth(255).evaluate((card) => {
      const board = card.closest(".board-scroll");
      if (!(board instanceof HTMLElement)) return false;
      const box = card.getBoundingClientRect();
      const bounds = board.getBoundingClientRect();
      const style = getComputedStyle(card);
      const extent = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
      return card.matches(":focus-visible") && box.left - extent >= bounds.left
        && box.right + extent <= bounds.right && box.top - extent >= bounds.top && box.bottom + extent <= bounds.bottom;
    });
    expect(lastOutlineVisible).toBe(true);
    await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
    await expect(page.getByLabel("Grid size")).toBeVisible();
    await page.screenshot({ path: "evidence/layout-zoom-16x16-640x400-dsf2.png", fullPage: true });
  } finally {
    await context.close();
  }
});


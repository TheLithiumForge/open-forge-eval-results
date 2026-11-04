import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createGame } from "../src/game/board.ts";
import { completedSnapshot, representativeFaces, startDeal, accessibleFaceName } from "./support.ts";

async function openSize(page: Page, size: number): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Grid size", { exact: true }).selectOption(String(size));
  await startDeal(page, `np1-${size}-1`);
}

async function touchSwipe(page: Page, from: Readonly<{ x: number; y: number }>, to: Readonly<{ x: number; y: number }>): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let step = 1; step <= 4; step += 1) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
      x: from.x + ((to.x - from.x) * step) / 4,
      y: from.y + ((to.y - from.y) * step) / 4
    }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

test("16x16 boards scroll inside the board at 360px and 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openSize(page, 16);
  const cards = page.locator(".memory-card");
  const board = page.locator(".board-scroll");
  await expect(cards).toHaveCount(256);
  const phoneMetrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".memory-card"));
    const first = cards[0]?.getBoundingClientRect();
    const last = cards.at(-1)?.getBoundingClientRect();
    const area = document.querySelector(".board-scroll");
    if (first === undefined || last === undefined || !(area instanceof HTMLElement)) throw new Error("The large board is missing.");
    const bounds = area.getBoundingClientRect();
    return { firstWidth: first.width, lastWidth: last.width, pageWidth: document.documentElement.scrollWidth,
      scrollX: area.scrollWidth > area.clientWidth, scrollY: area.scrollHeight > area.clientHeight,
      maxHeight: Math.min(window.innerHeight * 0.7, 768), areaHeight: bounds.height };
  });
  expect(phoneMetrics.firstWidth).toBeGreaterThanOrEqual(44);
  expect(phoneMetrics.lastWidth).toBeGreaterThanOrEqual(44);
  expect(phoneMetrics.pageWidth).toBe(360);
  expect(phoneMetrics.scrollX).toBe(true);
  expect(phoneMetrics.scrollY).toBe(true);
  expect(phoneMetrics.areaHeight).toBeLessThanOrEqual(phoneMetrics.maxHeight + 2);

  await cards.nth(0).focus();
  for (let index = 0; index < 15; index += 1) await page.keyboard.press("ArrowRight");
  for (let index = 0; index < 15; index += 1) await page.keyboard.press("ArrowDown");
  await expect(cards.nth(255)).toBeFocused();
  const focused = await cards.nth(255).evaluate((card) => {
    const outer = card.getBoundingClientRect();
    const area = card.closest(".board-scroll");
    if (!(area instanceof HTMLElement)) throw new Error("The board scroll area is missing.");
    const inner = area.getBoundingClientRect();
    return { width: outer.width, height: outer.height, left: outer.left - inner.left,
      top: outer.top - inner.top, right: inner.right - outer.right, bottom: inner.bottom - outer.bottom };
  });
  expect(focused.width).toBeGreaterThanOrEqual(44);
  expect(focused.left).toBeGreaterThanOrEqual(5);
  expect(focused.top).toBeGreaterThanOrEqual(5);
  expect(focused.right).toBeGreaterThanOrEqual(5);
  expect(focused.bottom).toBeGreaterThanOrEqual(5);

  await page.setViewportSize({ width: 1280, height: 800 });
  const desktopMetrics = await page.evaluate(() => ({
    first: document.querySelector(".memory-card")?.getBoundingClientRect().width ?? 0,
    last: Array.from(document.querySelectorAll(".memory-card")).at(-1)?.getBoundingClientRect().width ?? 0,
    pageWidth: document.documentElement.scrollWidth
  }));
  expect(desktopMetrics.first).toBeGreaterThanOrEqual(44);
  expect(desktopMetrics.first).toBeLessThanOrEqual(88);
  expect(desktopMetrics.last).toBeGreaterThanOrEqual(44);
  expect(desktopMetrics.pageWidth).toBe(1280);
});

test("touch can scroll the 16x16 board and tap its first and last cards", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 360, height: 800 },
    deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await openSize(page, 16);
  const cards = page.locator(".memory-card");
  await cards.nth(0).tap();
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);

  const boardArea = page.locator(".board-scroll");
  await boardArea.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    window.scrollBy(0, Math.max(0, rect.bottom - window.innerHeight + 8));
  });
  const area = await boardArea.boundingBox();
  if (area === null) throw new Error("The board scroll area is missing.");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const before = await boardArea.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop,
      maxLeft: element.scrollWidth - element.clientWidth, maxTop: element.scrollHeight - element.clientHeight }));
    if (before.left >= before.maxLeft - 4 && before.top >= before.maxTop - 4) break;
    await touchSwipe(page, { x: area.x + area.width - 18, y: area.y + area.height * 0.76 },
      { x: area.x + 18, y: area.y + area.height * 0.24 });
  }
  const scroll = await page.locator(".board-scroll").evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
  expect(scroll.left).toBeGreaterThan(0);
  expect(scroll.top).toBeGreaterThan(0);

  await expect(cards.nth(255)).toBeInViewport();
  await cards.nth(255).tap();
  await expect(cards.nth(255)).toHaveAccessibleName(/revealed|matched/);
  await expect(page.locator(".score-strip")).toContainText("Moves: 1");
  await context.close();
});

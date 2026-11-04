import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { cardAt, facePositions, finishBoardByClicks, startBoard } from "./helpers.ts";

async function focusRingFits(page: import("@playwright/test").Page, index: number): Promise<boolean> {
  return cardAt(page, index).evaluate((button) => {
    const area = document.querySelector(".board-scroll");
    if (!(area instanceof HTMLElement)) throw new Error("The board scroll area is rendered.");
    const viewport = area.getBoundingClientRect();
    const card = button.getBoundingClientRect();
    return card.left - 5 >= viewport.left + area.clientLeft
      && card.right + 5 <= viewport.left + area.clientLeft + area.clientWidth
      && card.top - 5 >= viewport.top + area.clientTop
      && card.bottom + 5 <= viewport.top + area.clientTop + area.clientHeight;
  });
}

test("shows all 256 large-board cards inside the board scroll area at both wide and phone sizes", async ({ page }) => {
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await startBoard(page, "np1-16-1");
    const measure = await page.evaluate(() => {
      const area = document.querySelector(".board-scroll");
      const cards = document.querySelectorAll(".board-grid > button");
      const grid = document.querySelector(".board-grid");
      const first = cards.item(0);
      const last = cards.item(cards.length - 1);
      if (!(area instanceof HTMLElement) || !(grid instanceof HTMLElement) || !(first instanceof HTMLElement) || !(last instanceof HTMLElement)) throw new Error("The board is rendered.");
      return {
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        count: cards.length,
        cardWidth: first.getBoundingClientRect().width,
        areaScrollWidth: area.scrollWidth,
        areaClientWidth: area.clientWidth,
        areaScrollHeight: area.scrollHeight,
        areaClientHeight: area.clientHeight,
        cardGap: getComputedStyle(grid).columnGap,
        focusMargin: getComputedStyle(last).scrollMargin,
      };
    });
    expect(measure.count).toBe(256);
    expect(measure.width).toBeLessThanOrEqual(measure.viewport);
    expect(measure.cardWidth).toBeGreaterThanOrEqual(44);
    expect(measure.cardWidth).toBeLessThanOrEqual(88);
    expect(measure.cardGap).toBe("6px");
    expect(measure.focusMargin).toBe("6px");
    if (width === 360) {
      expect(measure.cardWidth).toBe(44);
      expect(measure.areaScrollWidth).toBeGreaterThan(measure.areaClientWidth);
    }
    const firstCard = cardAt(page, 0);
    await page.getByRole("button", { name: "Restart" }).focus();
    await page.keyboard.press("Tab");
    await expect(firstCard).toBeFocused();
    expect(await focusRingFits(page, 0)).toBe(true);
    for (let row = 0; row < 15; row += 1) await page.keyboard.press("ArrowDown");
    for (let column = 0; column < 15; column += 1) await page.keyboard.press("ArrowRight");
    await expect(cardAt(page, 255)).toBeFocused();
    expect(await focusRingFits(page, 255)).toBe(true);
    for (let column = 0; column < 15; column += 1) await page.keyboard.press("ArrowLeft");
    for (let row = 0; row < 7; row += 1) await page.keyboard.press("ArrowUp");
    await expect(cardAt(page, 128)).toBeFocused();
    expect(await focusRingFits(page, 128)).toBe(true);
  }
});

test("touch swipes scroll the 16x16 board vertically and horizontally on a phone", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 360, height: 800 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await startBoard(page, "np1-16-1");
    const area = page.locator(".board-scroll");
    await area.scrollIntoViewIfNeeded();
    const bounds = await area.boundingBox();
    if (bounds === null) throw new Error("The board scroll area is visible.");
    const client = await context.newCDPSession(page);
    const x = bounds.x + bounds.width - 22;
    const y = bounds.y + bounds.height - 40;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - 180 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await area.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const middle = await area.boundingBox();
    if (middle === null) throw new Error("The board scroll area stays visible.");
    const touchX = middle.x + middle.width - 20;
    const touchY = middle.y + 60;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchX, y: touchY }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: middle.x + 30, y: touchY }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => area.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});

test("creates and reviews the complete 128-face grayscale sheet at 44px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await startBoard(page, "np1-16-1");
  await finishBoardByClicks(page, 16);
  await expect(page.locator(".win-banner")).toBeVisible();
  await page.evaluate((faces) => {
    const grid = document.querySelector(".board-grid");
    if (!(grid instanceof HTMLElement)) throw new Error("The board is rendered.");
    const cards = grid.querySelectorAll(".card");
    const sheet = document.createDocumentFragment();
    for (const [face, position] of faces) {
      const card = cards.item(position);
      if (!(card instanceof HTMLButtonElement)) throw new Error("Each requested face card is rendered.");
      const item = document.createElement("div");
      item.className = "face-sheet-item";
      const label = document.createElement("span");
      label.className = "face-id-label";
      label.textContent = String(face).padStart(3, "0");
      item.append(card, label);
      sheet.append(item);
    }
    grid.replaceChildren(sheet);
  }, facePositions("np1-16-1"));
  await page.addStyleTag({
    content: ".board-scroll{max-height:none!important;overflow:visible!important}.board-grid{grid-template-columns:repeat(16,50px)!important;width:890px!important;gap:6px!important;margin:0!important;filter:grayscale(1)}.face-sheet-item{width:50px;height:56px;display:grid;grid-template-rows:44px 12px;justify-items:center}.face-id-label{font-size:10px;line-height:12px;color:var(--secondary)}.card{width:44px!important;height:44px!important;min-width:44px!important;max-width:44px!important}.card:focus-visible{outline:none!important}.match-check{display:none!important}",
  });
  await mkdir("evidence", { recursive: true });
  await page.locator(".board-grid").screenshot({ path: resolve("evidence/faces-grayscale.png"), animations: "disabled" });
  const labels = await page.locator(".face-id-label").allTextContents();
  expect(labels).toHaveLength(128);
  expect(labels[0]).toBe("000");
  expect(labels[127]).toBe("127");
  const counts = await page.locator(".face-sheet-item > .card").count();
  expect(counts).toBe(128);
  const measured = await page.locator(".card").nth(0).evaluate((button) => button.getBoundingClientRect().width);
  expect(measured).toBe(44);
});

test("keeps controls and winning four-by-four and sixteen-by-sixteen games readable at 200-percent zoom dimensions", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  try {
    await startBoard(page, "np1-4-1");
    await cardAt(page, 0).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
    for (const size of [4, 16]) {
      await startBoard(page, `np1-${size}-1`);
      await finishBoardByClicks(page, size);
      const summary = page.getByRole("region", { name: "Game complete" });
      await expect(summary).toBeVisible();
      const layout = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll(".status-panel p, .game-controls select, .game-controls button, .win-banner"));
        const banner = document.querySelector(".win-banner");
        if (!(banner instanceof HTMLElement)) throw new Error("The completion banner is rendered.");
        const boxes = items.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top + scrollY, bottom: box.bottom + scrollY };
        });
        const overlaps = boxes.some((box, index) => boxes.slice(index + 1).some((other) =>
          box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top,
        ));
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          fits: boxes.every((box) => box.left >= 0 && box.right <= innerWidth),
          overlaps,
          minimumFontSize: Math.min(...items.map((element) => parseFloat(getComputedStyle(element).fontSize))),
          animationDuration: getComputedStyle(banner).animationDuration,
        };
      });
      expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.fits).toBe(true);
      expect(layout.overlaps).toBe(false);
      expect(layout.minimumFontSize).toBeGreaterThanOrEqual(14);
      expect(layout.animationDuration).toBe("0.6s");
    }
  } finally {
    await context.close();
  }
});

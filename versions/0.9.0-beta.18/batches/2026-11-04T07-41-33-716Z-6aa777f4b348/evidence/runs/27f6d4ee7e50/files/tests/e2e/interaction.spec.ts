import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { boardCards, dragTouch, loadBoardCode, openGame } from "./support.ts";

declare global {
  interface Window {
    __npPointerCancels: number;
  }
}

async function touchScrollJourney(browser: Browser): Promise<void> {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 360, height: 800 }, hasTouch: true });
  try {
    const page = await context.newPage();
    await openGame(page);
    await loadBoardCode(page, "np1-16-1");
    const firstCard = await boardCards(page).nth(0).boundingBox();
    if (firstCard === null) throw new Error("First card is not visible at the start of the 16x16 board.");
    await page.touchscreen.tap(firstCard.x + firstCard.width / 2, firstCard.y + firstCard.height / 2);
    await expect(boardCards(page).nth(0)).toHaveAttribute("aria-label", /revealed/);
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(boardCards(page).nth(0)).toHaveAttribute("aria-label", /closed/);
    const scroll = page.locator(".board-scroll");
    const area = await scroll.boundingBox();
    if (area === null) throw new Error("Board scroll area is not visible.");
    await page.evaluate(() => {
      window.__npPointerCancels = 0;
      document.addEventListener("pointercancel", () => { window.__npPointerCancels += 1; }, true);
    });
    const startX = area.x + area.width / 2;
    const startY = area.y + area.height / 2;
    for (let swipe = 0; swipe < 4; swipe += 1) await dragTouch(page, startX + 120, startY, startX - 120, startY);
    for (let swipe = 0; swipe < 4; swipe += 1) await dragTouch(page, startX, startY + 100, startX, startY - 100);
    const offset = await scroll.evaluate((node) => ({ left: node.scrollLeft, top: node.scrollTop }));
    expect(offset.left).toBeGreaterThan(0);
    expect(offset.top).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__npPointerCancels)).toBeGreaterThan(0);
    await expect(page.locator(".face-artwork")).toHaveCount(0);
    const last = await boardCards(page).nth(255).boundingBox();
    if (last === null) throw new Error("Last card did not reach the viewport.");
    const lastCardIsVisible = await boardCards(page).nth(255).evaluate((card) => {
      const board = card.closest(".board-scroll");
      if (!(board instanceof HTMLElement)) return false;
      const cardBox = card.getBoundingClientRect();
      const boardBox = board.getBoundingClientRect();
      return cardBox.left >= boardBox.left && cardBox.right <= boardBox.right
        && cardBox.top >= boardBox.top && cardBox.bottom <= boardBox.bottom;
    });
    expect(lastCardIsVisible).toBe(true);
    await page.touchscreen.tap(last.x + last.width / 2, last.y + last.height / 2);
    await expect(boardCards(page).nth(255)).toHaveAttribute("aria-label", /revealed/);
  } finally {
    await context.close();
  }
}

test("hover, right-click, and touch cancellation do not reveal cards; taps and primary clicks do", async ({ browser, page }) => {
  await openGame(page);
  await loadBoardCode(page, "np1-4-1");
  const first = boardCards(page).nth(0);
  await first.hover();
  await expect(first).toHaveAttribute("aria-label", /closed/);
  await first.click({ button: "right" });
  await expect(first).toHaveAttribute("aria-label", /closed/);
  await expect(page.locator(".game-status")).toContainText("Moves: 0");
  await first.click();
  await expect(first).toHaveAttribute("aria-label", /revealed/);

  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 360, height: 800 }, hasTouch: true });
  try {
    const touchPage = await context.newPage();
    await openGame(touchPage);
    await loadBoardCode(touchPage, "np1-4-1");
    const touchFirst = await boardCards(touchPage).nth(0).boundingBox();
    if (touchFirst === null) throw new Error("First card is not visible.");
    await touchPage.touchscreen.tap(touchFirst.x + touchFirst.width / 2, touchFirst.y + touchFirst.height / 2);
    await expect(boardCards(touchPage).nth(0)).toHaveAttribute("aria-label", /revealed/);
  } finally {
    await context.close();
  }
  await touchScrollJourney(browser);
});

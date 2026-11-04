import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { cardButtons, loadBoard } from "./support.ts";

async function moveByArrows(page: import("@playwright/test").Page, from: number, to: number): Promise<void> {
  let current = from;
  while (current % 16 < to % 16) {
    await page.keyboard.press("ArrowRight");
    current += 1;
  }
  while (current % 16 > to % 16) {
    await page.keyboard.press("ArrowLeft");
    current -= 1;
  }
  while (Math.floor(current / 16) < Math.floor(to / 16)) {
    await page.keyboard.press("ArrowDown");
    current += 16;
  }
  while (Math.floor(current / 16) > Math.floor(to / 16)) {
    await page.keyboard.press("ArrowUp");
    current -= 16;
  }
}

async function completeOutlineIsVisible(page: import("@playwright/test").Page, index: number): Promise<boolean> {
  return cardButtons(page).nth(index).evaluate((card) => {
    const board = card.closest(".board-scroll");
    if (!(board instanceof HTMLElement)) throw new Error("Board scroller is missing");
    const cardBox = card.getBoundingClientRect();
    const boardBox = board.getBoundingClientRect();
    const style = getComputedStyle(card);
    const extent = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
    return card.matches(":focus-visible")
      && cardBox.left - extent >= boardBox.left
      && cardBox.right + extent <= boardBox.right
      && cardBox.top - extent >= boardBox.top
      && cardBox.bottom + extent <= boardBox.bottom;
  });
}

test("16x16 stays inside the page and scrolls cards inside the board at both layouts", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await mkdir(resolve("evidence"), { recursive: true });

  for (const size of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(size);
    await loadBoard(page, "np1-16-1");
    const measures = await page.evaluate(() => {
      const board = document.querySelector(".board-scroll");
      const cards = Array.from(document.querySelectorAll<HTMLButtonElement>(".board-grid > button.card"));
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        boardClientWidth: board?.clientWidth ?? 0,
        boardScrollWidth: board?.scrollWidth ?? 0,
        boardClientHeight: board?.clientHeight ?? 0,
        boardScrollHeight: board?.scrollHeight ?? 0,
        cardBoxes: cards.map((card) => {
          const box = card.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      };
    });
    expect(measures.pageWidth).toBeLessThanOrEqual(size.width);
    expect(measures.viewportWidth).toBe(size.width);
    expect(measures.cardBoxes).toHaveLength(256);
    for (const box of measures.cardBoxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBe(box.height);
    }
    expect(measures.boardScrollHeight).toBeGreaterThan(measures.boardClientHeight);
    if (size.width === 360) expect(measures.boardScrollWidth).toBeGreaterThan(measures.boardClientWidth);
    else expect(measures.boardScrollWidth).toBeLessThanOrEqual(measures.boardClientWidth);
    await expect(page.getByLabel("Grid size")).toBeVisible();
    await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();

    const filename = size.width === 360 ? "layout-16x16-360x800.png" : "layout-16x16-1280x800.png";
    await page.screenshot({ path: resolve("evidence", filename), fullPage: true });
    await cardButtons(page).nth(0).focus();
    await moveByArrows(page, 0, 128);
    await expect(cardButtons(page).nth(128)).toBeFocused();
    expect(await completeOutlineIsVisible(page, 128)).toBe(true);
    await moveByArrows(page, 128, 255);
    await expect(cardButtons(page).nth(255)).toBeFocused();
    expect(await completeOutlineIsVisible(page, 255)).toBe(true);
  }
});


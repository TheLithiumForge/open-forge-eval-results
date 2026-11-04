import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { cards, loadBoard, loadSnapshot, openGame } from './gameHarness.ts';
import { checkFocusClearance, swipe } from './layoutHarness.ts';

const layouts = [
  { width: 360, height: 800, scale: 1 }, { width: 1280, height: 800, scale: 1 },
  { width: 640, height: 400, scale: 2 },
];
for (const layout of layouts) {
  test.describe(`layout ${layout.width}x${layout.height} scale ${layout.scale}`, () => {
    test.use({ viewport: { width: layout.width, height: layout.height }, deviceScaleFactor: layout.scale });
    for (const size of [4, 16]) {
      test(`${size}x${size} pointer, keyboard, focus and completion layout`, async ({ page }) => {
        await openGame(page, true); await loadBoard(page, `np1-${size}-1`);
        await expect(cards(page)).toHaveCount(size * size);
        const geometry = await page.evaluate(() => {
          const area = document.querySelector('.board-scroll');
          const card = document.querySelector('.card');
          if (!area || !card) throw new Error('Missing board.');
          const box = card.getBoundingClientRect();
          return { page: document.documentElement.scrollWidth, viewport: innerWidth,
            cardWidth: box.width, cardHeight: box.height, boardHeight: area.clientHeight,
            boardScroll: area.scrollWidth, boardClient: area.clientWidth };
        });
        expect(geometry.page).toBe(geometry.viewport);
        expect(geometry.cardWidth).toBeGreaterThanOrEqual(44);
        expect(geometry.cardWidth).toBeLessThanOrEqual(88);
        expect(geometry.cardHeight).toBeCloseTo(geometry.cardWidth, 4);
        expect(geometry.boardHeight).toBeLessThanOrEqual(Math.min(layout.height * .7, 768));
        if (size === 4) expect(geometry.boardScroll).toBe(geometry.boardClient);
        await cards(page).nth(0).click();
        await expect(cards(page).nth(0)).toHaveClass('card card--revealed');
        await checkFocusClearance(page, 0);
        await page.keyboard.press('Space');
        await checkFocusClearance(page, Math.floor(size * size / 2));
        await cards(page).nth(0).focus();
        for (let row = 1; row < size; row += 1) await page.keyboard.press('ArrowDown');
        for (let column = 1; column < size; column += 1) await page.keyboard.press('ArrowRight');
        await expect(cards(page).nth(size * size - 1)).toBeFocused();
        await checkFocusClearance(page, size * size - 1);
        await expect(page.locator('.card:focus')).toHaveCSS('outline-width', '3px');
        await expect(page.locator('.card:focus')).toHaveCSS('outline-offset', '2px');
        await loadSnapshot(page, JSON.stringify({ version: 1, boardCode: `np1-${size}-1`,
          matched: Array.from({ length: size * size }, (_, index) => index),
          selection: { kind: 'closed' }, moves: size * size / 2, elapsedMs: 1000, started: true }));
        await expect(page.locator('.win-banner')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(layout.width);
        await page.locator('summary').click();
        await mkdir('evidence', { recursive: true });
        await page.screenshot({ path: `evidence/layout-${layout.width}-${size}.png`, fullPage: true });
      });
    }
  });
}

for (const width of [360, 1280]) test.describe(`large-board touch scrolling at ${width}`, () => {
  test.use({ viewport: { width, height: 800 }, hasTouch: true });
  test('first and last cards are reachable with touch scrolling inside the board', async ({ page }) => {
    await openGame(page); await loadBoard(page, 'np1-16-1');
    await page.locator('summary').click();
    await cards(page).nth(0).tap();
    for (let count = 0; count < 3; count += 1) await swipe(page, true);
    for (let count = 0; count < 2; count += 1) await swipe(page, false);
    await expect.poll(() => page.locator('.board-scroll').evaluate((element) =>
      element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
      && element.scrollTop + element.clientHeight >= element.scrollHeight - 1)).toBe(true);
    await cards(page).nth(255).tap();
    await expect(cards(page).nth(255)).not.toHaveClass('card card--closed');
    for (let count = 0; count < 3; count += 1) await swipe(page, true, true);
    for (let count = 0; count < 2; count += 1) await swipe(page, false, true);
    await expect.poll(() => page.locator('.board-scroll').evaluate((element) =>
      element.scrollLeft <= 1 && element.scrollTop <= 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
});

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, nearWin } from './gameDriver.ts';

async function visibleOutline(page: Page, index: number) {
  const bounds = await cards(page).nth(index).evaluate((element) => {
    const card = element.getBoundingClientRect();
    const scroll = element.closest('.board-scroll')?.getBoundingClientRect();
    if (!scroll) throw new Error('Missing board scroll area');
    return { left: card.left - scroll.left, top: card.top - scroll.top,
      right: scroll.right - card.right, bottom: scroll.bottom - card.bottom,
      viewportTop: card.top, viewportBottom: innerHeight - card.bottom, outline: getComputedStyle(element).outlineWidth };
  });
  for (const distance of [bounds.left, bounds.top, bounds.right, bounds.bottom, bounds.viewportTop, bounds.viewportBottom]) expect(distance).toBeGreaterThanOrEqual(5);
  expect(bounds.outline).toBe('3px');
}
for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  for (const size of viewport.width === 640 ? [4, 16] : [16]) test(`${size}x${size} layout and complete focus outline at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1 });
    const page = await context.newPage();
    await page.goto('/');
    await loadBoard(page, `np1-${size}-1`);
    await expect(cards(page)).toHaveCount(size * size);
    const measurements = await page.evaluate(() => {
      const board = document.querySelector('.board-scroll');
      const card = document.querySelector('.card');
      if (!board || !card) throw new Error('Missing board');
      return { width: document.documentElement.scrollWidth, viewport: innerWidth, height: board.getBoundingClientRect().height,
        cardWidth: card.getBoundingClientRect().width, cardHeight: card.getBoundingClientRect().height, max: Math.min(innerHeight * 0.7, 768) };
    });
    expect(measurements.width).toBe(measurements.viewport);
    expect(measurements.height).toBeLessThanOrEqual(measurements.max + 0.1);
    expect(measurements.cardWidth).toBeGreaterThanOrEqual(44);
    expect(measurements.cardWidth).toBeLessThanOrEqual(88);
    expect(measurements.cardHeight).toBeCloseTo(measurements.cardWidth, 1);
    await page.getByRole('button', { name: 'Restart', exact: true }).focus();
    await page.keyboard.press('Tab');
    await visibleOutline(page, 0);
    for (let row = 0; row < size - 1; row += 1) await page.keyboard.press('ArrowDown');
    for (let column = 0; column < size - 1; column += 1) await page.keyboard.press('ArrowRight');
    await expect(cards(page).nth(size * size - 1)).toBeFocused();
    await visibleOutline(page, size * size - 1);
    for (let step = 0; step < Math.floor(size / 2); step += 1) {
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowUp');
    }
    const middle = (size - 1 - Math.floor(size / 2)) * (size + 1);
    await visibleOutline(page, middle);
    await cards(page).nth(middle).click();
    await expect(cards(page).nth(middle)).toHaveAccessibleName(/revealed$/);
    await page.screenshot({ path: `evidence/board-${size}-${viewport.width}x${viewport.height}.png`, fullPage: true });
    if (size === 4) {
      await loadSnapshot(page, nearWin());
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await cards(page).nth(12).click();
      await cards(page).nth(13).click();
      await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    }
    await context.close();
  });
}

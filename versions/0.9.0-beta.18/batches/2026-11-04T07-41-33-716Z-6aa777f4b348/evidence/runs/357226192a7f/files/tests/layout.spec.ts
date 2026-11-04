import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, completedSnapshot, loadBoard, loadSnapshot } from './helpers.ts';

async function focusIsVisible(page: Page) {
  const bounds = await page.evaluate(() => {
    const card = document.activeElement?.getBoundingClientRect();
    const area = document.querySelector('.board-scroll')?.getBoundingClientRect();
    if (!card || !area) throw new Error('Missing focus bounds');
    return { card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom },
      area: { left: area.left, right: area.right, top: area.top, bottom: area.bottom } };
  });
  expect(bounds.card.left - 5).toBeGreaterThanOrEqual(bounds.area.left);
  expect(bounds.card.right + 5).toBeLessThanOrEqual(bounds.area.right);
  expect(bounds.card.top - 5).toBeGreaterThanOrEqual(bounds.area.top);
  expect(bounds.card.bottom + 5).toBeLessThanOrEqual(bounds.area.bottom);
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test('boards fit and keyboard focus scrolls completely into view at ' + viewport.width, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1 });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    for (const size of [4, 16]) {
      await loadBoard(page, 'np1-' + size + '-1');
      await expect(cards(page)).toHaveCount(size * size);
      const layout = await page.evaluate(() => {
        const card = document.querySelector('.card')?.getBoundingClientRect();
        const board = document.querySelector('.board-scroll');
        if (!card || !board) throw new Error('Missing board');
        return { cardWidth: card.width, cardHeight: card.height, page: document.documentElement.scrollWidth,
          width: innerWidth, boardHeight: board.clientHeight, viewportHeight: innerHeight };
      });
      expect(layout.page).toBeLessThanOrEqual(layout.width);
      expect(layout.cardWidth).toBeGreaterThanOrEqual(44);
      expect(layout.cardWidth).toBeLessThanOrEqual(88);
      expect(layout.cardHeight).toBeCloseTo(layout.cardWidth);
      expect(layout.boardHeight).toBeLessThanOrEqual(Math.min(layout.viewportHeight * 0.7, 768));
      if (size === 4) expect(await page.locator('.board-scroll').evaluate(area => area.scrollWidth <= area.clientWidth)).toBe(true);
      await page.getByRole('button', { name: 'Restart', exact: true }).focus();
      await page.keyboard.press('Tab');
      await focusIsVisible(page);
      for (let i = 0; i < size - 1; i++) await page.keyboard.press('ArrowDown');
      for (let i = 0; i < size - 1; i++) await page.keyboard.press('ArrowRight');
      await expect(cards(page).last()).toBeFocused();
      await focusIsVisible(page);
      await page.keyboard.press('Enter');
      await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
      for (let i = 0; i < Math.floor(size / 2); i++) await page.keyboard.press('ArrowUp');
      for (let i = 0; i < Math.floor(size / 2); i++) await page.keyboard.press('ArrowLeft');
      await focusIsVisible(page);
      await loadSnapshot(page, completedSnapshot('np1-' + size + '-1', size * size / 2));
      await expect(page.locator('.win-banner')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    if (viewport.width === 360) {
      mkdirSync('evidence', { recursive: true });
      await page.screenshot({ path: 'evidence/mobile-16x16.png', fullPage: true });
    }
    await context.close();
  });
}

test('reduced motion and one completion pulse', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  // Import all but the final pair, so this completion is earned locally.
  const matched = Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11);
  await loadSnapshot(page, JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched,
    selection: { kind: 'closed' }, moves: 7, elapsedMs: 3000, started: true }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
  await expect.poll(() => page.locator('.win-banner').evaluate(element => element.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(cards(page).first()).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
});

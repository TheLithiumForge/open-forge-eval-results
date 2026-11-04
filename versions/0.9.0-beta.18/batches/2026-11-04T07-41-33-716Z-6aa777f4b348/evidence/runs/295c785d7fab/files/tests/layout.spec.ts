import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadBoard, loadSnapshot, progress } from './helpers.ts';
import { swipeBoard } from './touch.ts';

const VIEWS = [{ width: 360, height: 800, scale: 1 }, { width: 1280, height: 800, scale: 1 },
  { width: 640, height: 400, scale: 2 }] as const;

async function focusedOutline(page: Page): Promise<void> {
  const bounds = await page.locator('.card:focus').evaluate(element => {
    const card = element.getBoundingClientRect();
    const board = element.closest('.board-scroll');
    if (!(board instanceof HTMLElement)) throw new Error('Missing board.');
    const area = board.getBoundingClientRect();
    return { left: card.left - area.left, right: area.left + board.clientWidth - card.right,
      top: card.top - area.top, bottom: area.top + board.clientHeight - card.bottom,
      outline: getComputedStyle(element).outlineWidth, offset: getComputedStyle(element).outlineOffset };
  });
  expect(Math.min(bounds.left, bounds.right, bounds.top, bounds.bottom)).toBeGreaterThanOrEqual(5);
  expect(bounds.outline).toBe('3px');
  expect(bounds.offset).toBe('2px');
}

for (const view of VIEWS) {
  test.describe(`${view.width}x${view.height} scale ${view.scale}`, () => {
    test.use({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: view.scale, hasTouch: true });
    for (const size of [4, 16]) {
      test(`${size}x${size} fits the page and keeps first, middle and last keyboard outlines visible`, async ({ page }) => {
        await page.goto('/');
        await loadBoard(page, `np1-${size}-1`);
        await page.locator('summary').click();
        await expect(page.locator('.card')).toHaveCount(size * size);
        const metrics = await page.locator('.card').evaluateAll(cards => cards.map(card => {
          const rect = card.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }));
        for (const card of metrics) {
          expect(card.width).toBeGreaterThanOrEqual(44);
          expect(card.width).toBeLessThanOrEqual(88);
          expect(Math.abs(card.width - card.height)).toBeLessThan(0.1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(view.width);
        await page.getByRole('button', { name: 'Restart', exact: true }).focus();
        await page.keyboard.press('Tab');
        await focusedOutline(page);
        for (let column = 1; column < size; column++) await page.keyboard.press('ArrowRight');
        for (let row = 1; row < size; row++) await page.keyboard.press('ArrowDown');
        await expect(page.locator('.card').last()).toBeFocused();
        await focusedOutline(page);
        for (let step = 0; step < Math.floor(size / 2); step++) {
          await page.keyboard.press('ArrowLeft');
          await page.keyboard.press('ArrowUp');
        }
        await focusedOutline(page);
        await page.keyboard.press('Enter');
        await expect(page.locator('.card.revealed')).toHaveCount(1);
        await page.getByRole('button', { name: 'Restart', exact: true }).click();
        await page.locator('.card').first().tap();
        await expect(page.locator('.card.revealed')).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
      });
    }
    test('touch scrolling reaches both ends of a 16x16 board', async ({ page }) => {
      await page.goto('/');
      await loadBoard(page, 'np1-16-1');
      await page.locator('summary').click();
      const board = page.locator('.board-scroll');
      await board.scrollIntoViewIfNeeded();
      const cdp = await page.context().newCDPSession(page);
      for (let step = 0; step < 4; step++) await swipeBoard(page, cdp, 'vertical', -1);
      for (let step = 0; step < 4; step++) await swipeBoard(page, cdp, 'horizontal', -1);
      await expect.poll(() => board.evaluate(element => element.scrollTop + element.clientHeight >= element.scrollHeight - 2)).toBe(true);
      await expect.poll(() => board.evaluate(element => element.scrollLeft + element.clientWidth >= element.scrollWidth - 2)).toBe(true);
      for (let step = 0; step < 4; step++) await swipeBoard(page, cdp, 'horizontal', 1);
      for (let step = 0; step < 4; step++) await swipeBoard(page, cdp, 'vertical', 1);
      await expect.poll(() => board.evaluate(element => element.scrollTop)).toBe(0);
      await expect.poll(() => board.evaluate(element => element.scrollLeft)).toBe(0);
      await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
      await expect(page.locator('.card.revealed')).toHaveCount(0);
      await cdp.detach();
    });
  });
}

test('required typography, colors and a single completion pulse become static', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveCSS('font-size', '16px');
  await expect(page.locator('h1')).toHaveCSS('font-size', '24px');
  await expect(page.locator('.game-status')).toHaveCSS('font-size', '14px');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(9, 11, 20)');
  await expect(page.locator('.card').first()).toHaveCSS('background-color', 'rgb(27, 32, 52)');
  await loadSnapshot(page, progress(7));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(12).dispatchEvent('click');
  await page.locator('.card').nth(13).dispatchEvent('click');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
  await page.waitForTimeout(700);
  expect(await page.locator('.win-banner').evaluate(element => element.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.card').first()).toHaveCSS('transition-duration', '0s');
});

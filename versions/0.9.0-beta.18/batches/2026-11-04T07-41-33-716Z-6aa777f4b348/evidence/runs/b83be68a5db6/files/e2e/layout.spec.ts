import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadBoard, loadSnapshot, nearWin } from './helpers.ts';
import { touchScrollToEnd } from './touch.ts';

async function checkFocusOutline(page: Page) {
  const result = await page.locator('.card:focus').evaluate(card => {
    const area = card.closest('.board-scroll');
    if (!area) throw new Error('Missing board area');
    const box = card.getBoundingClientRect();
    const container = area.getBoundingClientRect();
    return { left: box.left - container.left, top: box.top - container.top,
      right: container.left + area.clientWidth - box.right,
      bottom: container.top + area.clientHeight - box.bottom,
      pageTop: box.top, pageBottom: window.innerHeight - box.bottom };
  });
  for (const margin of Object.values(result)) expect(margin).toBeGreaterThanOrEqual(5);
}

for (const [width, height, scale] of [[360, 800, 1], [1280, 800, 1], [640, 400, 2]]) {
  test(`large board and zoom layout ${width}x${height}, scale ${scale}`, async ({ browser }) => {
    if (!width || !height || !scale) throw new Error('Missing viewport');
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale,
      baseURL: 'http://127.0.0.1:4173', hasTouch: true });
    const page = await context.newPage();
    await page.goto('/');
    await loadBoard(page);
    const first = await page.locator('.card').first().boundingBox();
    expect(first?.width).toBeGreaterThanOrEqual(44);
    await page.locator('.card').first().tap();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('.status')).toContainText('Moves: 1');
    await loadSnapshot(page, { ...nearWin(8), matched: Array.from({ length: 16 }, (_, i) => i) });
    await expect(page.locator('.win-banner')).toContainText('8 moves');
    const summary = await page.locator('.win-banner').boundingBox();
    expect(summary && summary.x + summary.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await loadBoard(page, 'np1-16-1');
    await expect(page.locator('.card')).toHaveCount(256);
    const measurements = await page.locator('.card').evaluateAll(cards => cards.map(card => {
      const box = card.getBoundingClientRect(); return { width: box.width, height: box.height };
    }));
    for (const box of measurements) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeLessThanOrEqual(88);
      expect(Math.abs(box.width - box.height)).toBeLessThan(0.1);
    }
    const heightActual = await page.locator('.board-scroll').evaluate(area => area.clientHeight);
    expect(heightActual).toBeLessThanOrEqual(Math.min(height * 0.7, 768));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await touchScrollToEnd(page, context);
    await expect(page.locator('.card').last()).toBeInViewport();
    await page.locator('.card').last().tap();
    await expect(page.locator('.card').last()).toHaveAccessibleName(/revealed$/);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.getByRole('button', { name: 'Restart', exact: true }).focus();
    await page.keyboard.press('Tab');
    await checkFocusOutline(page);
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowDown');
    await checkFocusOutline(page);
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('.card').last()).toBeFocused();
    await checkFocusOutline(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('.card').last()).toHaveAccessibleName(/revealed$/);
    await page.locator('.board-scroll').evaluate(area => { area.scrollTop = 0; area.scrollLeft = 0; });
    await page.locator('.card').first().tap();
    await expect(page.locator('.card').first()).toHaveAccessibleName(/revealed$/);
    await page.getByRole('button', { name: 'New Game', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeInViewport();
    await context.close();
  });
}

test('reduced motion, hover and completion pulse follow the visual rules', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await page.locator('.card').first().hover();
  await expect(page.locator('.card').first()).toHaveCSS('border-top-color', 'rgb(244, 246, 255)');
  await loadSnapshot(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(11).click();
  await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
  await page.locator('.card').first().hover();
  await expect(page.locator('.card').first()).toHaveCSS('border-top-color', 'rgb(139, 234, 125)');
  await page.waitForTimeout(650);
  expect(await page.locator('.win-banner').evaluate(node => node.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.card').first()).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
});

import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, completeSnapshot, loadBoard, loadSnapshot } from './journey.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large board stays inside ${viewport.width}x${viewport.height} with complete focus outlines`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await page.goto('/');
    await expect(cards(page)).toHaveCount(16);
    const defaultWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(defaultWidth).toBeLessThanOrEqual(viewport.width);
    if (viewport.width === 1280) {
      await mkdir('evidence', { recursive: true });
      await page.screenshot({ path: 'evidence/game-desktop.png', fullPage: true });
    }
    await loadBoard(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    const measurements = await page.locator('.board-scroll').evaluate(element => {
      const rects = [...element.querySelectorAll('button')].map(card => card.getBoundingClientRect());
      return { width: document.documentElement.scrollWidth, height: element.clientHeight,
        min: Math.min(...rects.map(rect => Math.min(rect.width, rect.height))),
        max: Math.max(...rects.map(rect => Math.max(rect.width, rect.height))) };
    });
    expect(measurements.width).toBeLessThanOrEqual(viewport.width);
    expect(measurements.height).toBeLessThanOrEqual(Math.min(viewport.height * .7, 768) + 1);
    expect(measurements.min).toBeGreaterThanOrEqual(44);
    expect(measurements.max).toBeLessThanOrEqual(88);
    await cards(page).first().focus();
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
    await expect(cards(page).last()).toBeFocused();
    for (const index of [255, 119, 0]) {
      await cards(page).nth(index).focus();
      const contained = await cards(page).nth(index).evaluate(element => {
        const card = element.getBoundingClientRect();
        const parent = element.closest('.board-scroll');
        if (!parent) return false;
        const box = parent.getBoundingClientRect();
        return card.left - 5 >= box.left && card.top - 5 >= box.top
          && card.right + 5 <= box.left + parent.clientWidth && card.bottom + 5 <= box.top + parent.clientHeight;
      });
      expect(contained).toBe(true);
    }
    // Simulate touch scrolling's resulting scroll offset, then perform a completed tap.
    await page.locator('.board-scroll').evaluate(element => {
      element.scrollTop = element.scrollHeight; element.scrollLeft = element.scrollWidth;
    });
    await cards(page).last().tap();
    await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
    await page.getByRole('button', { name: 'Restart', exact: true }).tap();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    if (viewport.width === 360) await page.screenshot({ path: 'evidence/game-mobile-16.png', fullPage: true });
    await loadSnapshot(page, completeSnapshot(16));
    await expect(page.locator('.win-banner')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await context.close();
  });
}

test('reduced motion removes card transitions and completion animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(cards(page).first()).toHaveCSS('transition-duration', '0s');
  await loadSnapshot(page, completeSnapshot(4, 7, false));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(2).click(); await cards(page).nth(6).click();
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
});

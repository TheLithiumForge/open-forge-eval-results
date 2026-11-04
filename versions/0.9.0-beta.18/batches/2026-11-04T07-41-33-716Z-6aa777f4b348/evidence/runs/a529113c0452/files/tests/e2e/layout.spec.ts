import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { assertFocusClearance, assertLayout } from './layoutSupport.ts';
import { cards, completed, loadBoard, loadProgress, nearWin, openGame, stat } from './support.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
  test(`large board remains within ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    await assertLayout(page, 4);
    await mkdir('evidence', { recursive: true });
    await page.screenshot({ path: `evidence/default-${viewport.width}.png`, fullPage: true });
    await loadBoard(page, 'np1-16-1');
    await assertLayout(page, 16);
    await page.getByRole('button', { name: 'Restart', exact: true }).focus();
    await page.keyboard.press('Tab');
    await assertFocusClearance(page);
    for (let count = 0; count < 15; count += 1) await page.keyboard.press('ArrowDown');
    for (let count = 0; count < 15; count += 1) await page.keyboard.press('ArrowRight');
    await expect(cards(page).last()).toBeFocused();
    await assertFocusClearance(page);
    for (let count = 0; count < 7; count += 1) await page.keyboard.press('ArrowUp');
    for (let count = 0; count < 7; count += 1) await page.keyboard.press('ArrowLeft');
    await expect(cards(page).nth(136)).toBeFocused();
    await assertFocusClearance(page);
    await page.screenshot({ path: `evidence/large-board-${viewport.width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'New Game', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeInViewport();
  });
}

test.describe('zoom-equivalent layout', () => {
  test.use({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  for (const size of [4, 16]) {
    test(`${size}x${size} is playable at 200 percent equivalent zoom`, async ({ page }) => {
      await openGame(page);
      await loadBoard(page, `np1-${size}-1`);
      await assertLayout(page, size);
      await cards(page).nth(0).click();
      await expect(page.locator('.card--revealed')).toHaveCount(1);
      await page.keyboard.press('ArrowRight');
      await assertFocusClearance(page);
      await loadProgress(page, completed(`np1-${size}-1`));
      await expect(stat(page, 'Moves')).toHaveText(`Moves: ${size * size / 2}`);
      const readable = await page.evaluate(() => {
        const controls = document.querySelector('.deal-controls')?.getBoundingClientRect();
        const status = document.querySelector('.game-status')?.getBoundingClientRect();
        const banner = document.querySelector('.win-banner')?.getBoundingClientRect();
        return controls !== undefined && status !== undefined && banner !== undefined
          && controls.bottom <= status.top && banner.width > 0
          && document.documentElement.scrollWidth === innerWidth;
      });
      expect(readable).toBe(true);
      await mkdir('evidence', { recursive: true });
      await page.screenshot({ path: `evidence/zoom-${size}.png`, fullPage: true });
      expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable=no|maximum-scale/);
    });
  }
});

test('reduced motion removes card transitions and the win pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page);
  await expect(cards(page).nth(0)).toHaveCSS('transition-duration', '0s');
  await loadProgress(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(2).click();
  await cards(page).nth(6).click();
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
});

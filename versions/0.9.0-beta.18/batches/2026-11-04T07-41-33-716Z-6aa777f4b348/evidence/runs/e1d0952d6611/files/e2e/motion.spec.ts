import { expect, test } from '@playwright/test';
import { loadBoard, pairsFor } from './helpers.ts';

async function completeKnownBoard(page: import('@playwright/test').Page): Promise<void> {
  await loadBoard(page, 'np1-4-1');
  for (const [first, second] of pairsFor('np1-4-1').values()) {
    await page.locator('.game-card').nth(first).dispatchEvent('click');
    await page.locator('.game-card').nth(second).dispatchEvent('click');
  }
}

test('normal completion pulses once for600ms then leaves a static banner', async ({ page }) => {
  await page.goto('/');
  await completeKnownBoard(page);
  const banner = page.locator('.completion-banner');
  await expect(banner).toHaveClass(/completion-banner--pulse/);
  await expect(banner).toHaveCSS('animation-duration', '0.6s');
  await expect(banner).toHaveCSS('animation-iteration-count', '1');
  await expect.poll(() => banner.evaluate((element) => element.getAnimations()[0]?.playState ?? 'none'))
    .toBe('finished');
  await expect(banner).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});

test('reduced motion completes with an immediately static banner and card borders', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await completeKnownBoard(page);
  await expect(page.locator('.completion-banner')).toHaveClass(/completion-banner--pulse/);
  await expect(page.locator('.completion-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.game-card').first()).toHaveCSS('transition-duration', '0s');
});

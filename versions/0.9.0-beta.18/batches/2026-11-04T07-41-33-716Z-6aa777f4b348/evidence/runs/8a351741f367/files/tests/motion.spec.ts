import { expect, test } from '@playwright/test';
import { card, completedText, loadSnapshot, nearlyCompleteText } from './gameActions.ts';

for (const reduced of [false, true]) {
  test(`completion motion respects reduced motion = ${reduced}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await loadSnapshot(page, nearlyCompleteText());
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(card(page, 12)).toHaveCSS('transition-duration', reduced ? '0s' : '0.12s');
    await card(page, 12).click();
    await card(page, 13).click();
    const banner = page.locator('.win-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveCSS('animation-name', reduced ? 'none' : 'win-pulse');
    if (!reduced) {
      await expect(banner).toHaveCSS('animation-duration', '0.6s');
      await expect(banner).toHaveCSS('animation-iteration-count', '1');
    }
    await page.waitForTimeout(700);
    expect(await banner.evaluate((element) => element.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
    await loadSnapshot(page, completedText());
    await expect(banner).toHaveCSS('animation-name', 'none');
  });
}

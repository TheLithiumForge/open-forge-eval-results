import { expect, test } from '@playwright/test';
import { freezePageClock, loadSnapshot, onePairRemainingSnapshot } from './helpers.ts';

test('every supported board size completes its resumed final match', async ({ page }) => {
  await freezePageClock(page);
  await page.goto('/');
  for (const side of [4, 6, 8, 10, 12, 14, 16]) {
    const pairs = (side * side) / 2;
    const progress = onePairRemainingSnapshot(`np1-${side}-1`, pairs - 1);
    await loadSnapshot(page, progress.json);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.locator('.memory-card').nth(progress.second).click();
    await expect(page.getByRole('heading', { name: 'Every pair found' })).toBeVisible();
    await expect(page.getByText(`Pairs: ${pairs}/${pairs}`)).toBeVisible();
    await expect(page.getByText(`Moves: ${pairs}`)).toBeVisible();
  }
});

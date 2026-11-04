import { expect, test } from '@playwright/test';
import { cards, freezeClock, loadBoard, openGame } from './deal-actions.ts';

test('hiding pauses the same elapsed and mismatch time, showing resumes only the remainder', async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(200);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"elapsedMs": 200/);
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"remainingMs": 600/);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(599);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"elapsedMs": 800/);
});

for (const action of ['Restart', 'New Game', 'Load board'] as const) {
  test(`${action} during a mismatch invalidates the earlier timer`, async ({ page }) => {
    await freezeClock(page);
    await openGame(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(300);
    if (action === 'Load board') await loadBoard(page);
    else await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('button', { name: action, exact: true })).toBeFocused();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    await cards(page).nth(2).click();
    await page.clock.runFor(1000);
    await expect(cards(page).nth(2)).toHaveAccessibleName(/revealed$/);
    await expect(page.locator('.card--revealed')).toHaveCount(1);
    await expect(cards(page).first()).toHaveAttribute('tabindex', '-1');
  });
}

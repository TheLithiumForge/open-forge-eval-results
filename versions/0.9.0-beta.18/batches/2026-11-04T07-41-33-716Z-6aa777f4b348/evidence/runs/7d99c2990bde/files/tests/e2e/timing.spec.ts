import { expect, test } from '@playwright/test';
import { cards, exported, frozenClock, loadBoard } from './helpers.ts';

test('visibility pauses both clocks and continues the exact remaining interval', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(4000);
  expect((await exported(page)).elapsedMs).toBe(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(page.locator('.card-revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card-revealed')).toHaveCount(0);
  expect((await exported(page)).elapsedMs).toBe(800);
});

for (const action of ['Restart', 'New Game', 'Grid size']) {
  test(`${action} invalidates an earlier mismatch callback`, async ({ page }) => {
    await frozenClock(page);
    await page.goto('/');
    await loadBoard(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(400);
    if (action === 'Grid size') await page.getByLabel('Grid size').selectOption('6');
    else await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    if (action === 'Restart') await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
    else await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
    await cards(page).nth(2).click();
    await page.clock.runFor(1000);
    await expect(page.locator('.card-revealed')).toHaveCount(1);
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  });
}

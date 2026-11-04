import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/deal.ts';
import { finish, freezeTime, loadBoard, setHidden } from './helpers.ts';

test.beforeEach(async ({ page }) => { await freezeTime(page); await page.goto('/'); });

test('initial labels, private backs, ignored activation, match and exact miss timing', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await loadBoard(page);
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(16);
  await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed');
  expect(await cards.first().getAttribute('data-face')).toBeNull();
  expect(await cards.first().innerHTML()).not.toContain('circle');
  await cards.nth(0).click(); await cards.nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards.nth(11).click();
  await expect(cards.nth(0)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. 1 pair matched.');
  await cards.nth(1).click(); await cards.nth(2).click();
  await cards.nth(3).click({ force: true });
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(page.locator('.revealed')).toHaveCount(2);
  await page.clock.runFor(17);
  await expect(page.locator('.revealed')).toHaveCount(0);
  await expect(page.locator('[aria-live]')).toHaveText('No match. Cards close after a short pause.');
});

test('visibility pauses both clocks and restarting invalidates the old turn', async ({ page }) => {
  await loadBoard(page);
  await page.locator('.card').nth(0).click(); await page.locator('.card').nth(1).click();
  await page.clock.runFor(300); await setHidden(page, true);
  await page.clock.runFor(5000); await setHidden(page, false);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await expect(page.locator('.revealed')).toHaveCount(2);
  await page.clock.runFor(480);
  await expect(page.locator('.revealed')).toHaveCount(2);
  await page.clock.runFor(40);
  await expect(page.locator('.revealed')).toHaveCount(0);
  await page.locator('.card').nth(0).click(); await page.locator('.card').nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.locator('.card').nth(2).click(); await page.clock.runFor(2000);
  await expect(page.locator('.revealed')).toHaveCount(1);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.locator('.card').nth(1).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
  await expect(page.locator('.revealed')).toHaveCount(0);
  await page.locator('.card').first().click(); await page.clock.runFor(1000);
  await expect(page.locator('.revealed')).toHaveCount(1);
});

for (const size of SIZES) {
  test(`completes every pair on ${size}x${size}`, async ({ page }) => {
    test.setTimeout(180000);
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await finish(page, code, size >= 8);
    await expect(page.locator('.matched')).toHaveCount(size ** 2);
    await expect(page.locator('.win')).toContainText('All pairs found.');
    await expect(page.getByText(`Moves: ${size ** 2 / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Best: ${size ** 2 / 2}`, { exact: true })).toBeVisible();
  });
}

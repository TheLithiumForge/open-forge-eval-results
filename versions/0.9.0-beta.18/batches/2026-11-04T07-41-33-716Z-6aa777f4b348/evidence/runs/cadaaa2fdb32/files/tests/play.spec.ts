import { expect, test } from '@playwright/test';
import { cards, finish, freezeClock, loadBoard, openTools, PAIRS } from './journey.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('native controls, concealed identities, turns, drafts and completion', async ({ page }) => {
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.locator(':focus')).toHaveCount(0);
  await loadBoard(page, '  np1-4-1  ');
  await expect(cards(page)).toHaveCount(16);
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(cards(page).locator('svg')).toHaveCount(0);
  const hiddenHTML = await cards(page).first().evaluate(element => element.outerHTML);
  expect(hiddenHTML).not.toMatch(/face|rose|plus|data-id|data-face/);
  await page.getByLabel('Board code', { exact: true }).fill('draft');
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await cards(page).nth(11).click();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. 1 pair matched.');
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft');
  for (const pair of PAIRS.slice(1)) for (const index of pair) await cards(page).nth(index).click();
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.locator('[aria-live]')).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d\d\./);
  await page.waitForTimeout(650);
  expect(await page.locator('.win-banner').evaluate(element => element.getAnimations().length)).toBe(0);
});

test('exact mismatch interval, repeated announcements and invalidated callbacks', async ({ page }) => {
  await freezeClock(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await page.clock.runFor(123);
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(cards(page).locator('svg')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(cards(page).locator('svg')).toHaveCount(0);
  const firstAnnouncement = await page.locator('[aria-live] > span').elementHandle();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  expect(await firstAnnouncement?.evaluate(element => element.isConnected)).toBe(false);
  await expect(page.locator('[aria-live]')).toHaveText('No match. Cards close after a short pause.');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await cards(page).nth(2).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(2).locator('svg')).toHaveCount(1);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(3).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(cards(page).locator('svg')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
});

test('hidden-page time pauses both clocks', async ({ page }) => {
  await freezeClock(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  await expect(cards(page).locator('svg')).toHaveCount(2);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(cards(page).locator('svg')).toHaveCount(2);
  await page.clock.runFor(1);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  await expect(cards(page).locator('svg')).toHaveCount(0);
  const value: unknown = JSON.parse(await page.getByLabel('Snapshot JSON').inputValue());
  expect(value).toMatchObject({ elapsedMs: 800, selection: { kind: 'closed' } });
});

test('best scores survive reload, keep equal/worse results, and respect size', async ({ page }) => {
  await loadBoard(page);
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await loadBoard(page);
  await finish(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.waitForTimeout(850);
  await finish(page);
  await expect(page.getByText('Moves: 9', { exact: true })).toBeVisible();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(cards(page)).toHaveCount(36);
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await openTools(page);
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
});

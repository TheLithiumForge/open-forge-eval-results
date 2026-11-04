import { expect, test } from '@playwright/test';
import { cards, completeSnapshot, exportSnapshot, freezeClock, live, loadBoard, loadSnapshot, mismatchSnapshot } from './journey.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('unfinished snapshots pause input and both clocks, then resume with focus', async ({ page }) => {
  await freezeClock(page);
  await loadSnapshot(page, mismatchSnapshot);
  await expect(live(page)).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await page.clock.runFor(5000);
  await cards(page).nth(3).click();
  await cards(page).nth(3).press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  expect(await exportSnapshot(page)).toEqual(mismatchSnapshot);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(3)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed:not(.matched)')).toHaveCount(2);
  await page.clock.runFor(1);
  await cards(page).nth(3).press('Enter');
  await expect(page.locator('.card.revealed:not(.matched)')).toHaveCount(1);
});

test('completed import is static and never replaces the local best', async ({ page }) => {
  await loadSnapshot(page, completeSnapshot());
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(live(page)).toHaveText('Loaded completed snapshot.');
});

test('invalid drafts keep the current game, saved size, and focus', async ({ page }) => {
  await loadBoard(page);
  await cards(page).nth(0).click();
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-01');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await loadSnapshot(page, { ...mismatchSnapshot, extra: true });
  await expect(live(page)).toHaveText('Invalid snapshot.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
});

test('board drafts survive card actions and valid codes trim control whitespace', async ({ page }) => {
  await loadBoard(page);
  await page.getByLabel('Board code', { exact: true }).fill('draft');
  await cards(page).nth(0).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft');
  await loadBoard(page, ' np1-6-1 ');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-1');
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
});

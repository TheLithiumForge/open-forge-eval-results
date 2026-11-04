import { expect, test } from '@playwright/test';
import { cards, frozen, loadBoard, readSnapshot } from './gameDriver.ts';

test('native controls, edited drafts, validation and button focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size').locator('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await loadBoard(page, '  np1-6-1  ');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON')).toHaveAttribute('maxlength', '65536');
  await page.getByLabel('Board code', { exact: true }).fill('correction draft');
  await cards(page).nth(0).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('correction draft');
  const saved = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid board code.');
  expect((await readSnapshot(page)).selection).toEqual({ kind: 'one', index: 0 });
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(saved);
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
  await page.getByLabel('Snapshot JSON').fill('{bad');
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{bad');
  await expect(page.getByRole('button', { name: 'Load snapshot' })).toBeFocused();
});

for (const action of ['Restart', 'New Game', 'size', 'board'] as const) test(`${action} invalidates pending turn callbacks`, async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  if (action === 'size') await page.getByLabel('Grid size').selectOption('6');
  else if (action === 'board') await loadBoard(page, 'np1-8-1');
  else await page.getByRole('button', { name: action, exact: true }).click();
  const restarted = await readSnapshot(page);
  expect(restarted).toMatchObject({ moves: 0, elapsedMs: 0, started: false, matched: [], selection: { kind: 'closed' } });
  if (action === 'Restart') expect(restarted.board.code).toBe('np1-4-1');
  if (action === 'New Game') expect(restarted.board.code).not.toBe('np1-4-1');
  await cards(page).nth(0).click();
  await page.clock.runFor(1000);
  expect((await readSnapshot(page)).selection).toEqual({ kind: 'one', index: 0 });
});

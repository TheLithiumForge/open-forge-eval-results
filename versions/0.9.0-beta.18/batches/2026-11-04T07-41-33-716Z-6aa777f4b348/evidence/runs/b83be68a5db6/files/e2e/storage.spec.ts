import { expect, test } from '@playwright/test';
import { exported, finishImported, loadBoard, loadSnapshot, nearWin } from './helpers.ts';

test('best records improve only on wins and survive fresh deals and reloads', async ({ page }) => {
  await page.goto('/');
  await finishImported(page, 12);
  await expect(page.locator('.status')).toContainText('Best: 12');
  await finishImported(page, 12);
  await expect(page.locator('.status')).toContainText('Best: 12');
  await finishImported(page, 15);
  await expect(page.locator('.status')).toContainText('Best: 12');
  await finishImported(page, 10);
  await expect(page.locator('.status')).toContainText('Best: 10');
  const completed = { ...nearWin(8), matched: Array.from({ length: 16 }, (_, i) => i) };
  await loadSnapshot(page, completed);
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.status')).toContainText('Best: 10');
  await loadBoard(page, 'np1-6-1');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  const fresh = await exported(page);
  expect(fresh.started).toBe(false);
  expect(fresh.board.boardCode).not.toBe('np1-6-1');
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.locator('.status')).toContainText('Best: 10');
});

test('counter caps do not prevent completion or matching', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, nearWin(999999, 359999999));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(11).click();
  await expect(page.locator('.win-banner')).toContainText('999999 moves · 5999:59');
  await expect(page.locator('.status')).toContainText('Best: 999999');
});

test('malformed preferences and unavailable storage leave play available', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('unrelated', 'keep');
    localStorage.setItem('neon-pairs.preferences.v1', '{"size":3,"best":{"4":1000000}}');
  });
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.locator('.status')).toContainText('Best: none');
  await loadBoard(page);
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } });
  });
  await page.reload();
  await loadBoard(page);
  await page.locator('.card').first().click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

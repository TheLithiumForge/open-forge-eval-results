import { expect, test } from '@playwright/test';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { loadBoard, loadSnapshot, reveal, snapshot, start } from './helpers.ts';

test('records only better played results, preserves sizes and never auto-saves progress', async ({ page }) => {
  await start(page);
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  for (const moves of [10, 10, 12, 8]) {
    await loadSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, index) => index)
      .filter((index) => index !== 0 && index !== 11), moves: moves - 1, elapsedMs: 10, started: true }));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await reveal(page, 0);
    await reveal(page, 11);
    await expect(page.getByText(`Best: ${moves === 8 ? 8 : 10}`, { exact: true })).toBeVisible();
    if (moves === 12) {
      await loadSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, index) => index),
        moves: 8, elapsedMs: 0, started: true }));
      await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
    }
  }
  await loadSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, index) => index),
    moves: 8, elapsedMs: 0, started: true }));
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.card.closed')).toHaveCount(36);
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.sort()).toEqual([PREFERENCES_KEY, 'unrelated'].sort());
});

test('valid loads save their size and failed loads keep it unchanged', async ({ page }) => {
  await start(page);
  await loadBoard(page, 'np1-6-1');
  await page.getByLabel('Board code', { exact: true }).fill('np1-16-0');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await loadSnapshot(page, '{"boardCode":"np1-14-1"}');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await loadSnapshot(page, snapshot({ boardCode: 'np1-8-1' }));
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  await expect(page.locator('.card.closed')).toHaveCount(64);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
});

for (const failure of ['malformed', 'getter', 'write']) {
  test(`storage ${failure} failure leaves a complete playable game`, async ({ page }) => {
    await page.addInitScript(({ key, mode }) => {
      if (mode === 'malformed') localStorage.setItem(key, '{broken');
      if (mode === 'getter') Object.defineProperty(window, 'localStorage', { get() { throw new Error('Blocked storage'); } });
      if (mode === 'write') Storage.prototype.setItem = () => { throw new Error('Quota exceeded'); };
    }, { key: PREFERENCES_KEY, mode: failure });
    await start(page);
    await expect(page.getByLabel('Grid size')).toHaveValue('4');
    await loadBoard(page);
    await reveal(page, 0);
    await reveal(page, 11);
    await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  });
}

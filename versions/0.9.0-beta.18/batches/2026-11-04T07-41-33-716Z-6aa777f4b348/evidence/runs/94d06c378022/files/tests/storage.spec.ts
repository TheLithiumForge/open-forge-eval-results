import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { clickCard, completedSnapshot, loadBoard, loadSnapshot, pairsForCode, progressSnapshot } from './helpers.ts';

const PREF_KEY = 'neon-pairs.preferences.v1';
const BEST_KEY = 'neon-pairs.best.v1';
const CODE = 'np1-4-1';

test('supported size persists, reload starts a fresh deal, and invalid saved preferences are ignored', async ({ page }) => {
  await page.context().addInitScript(() => {
    if (localStorage.getItem('test.storage-seeded') === 'yes') return;
    localStorage.setItem('neon-pairs.preferences.v1', JSON.stringify({ size: 6 }));
    localStorage.setItem('neon-pairs.best.v1', JSON.stringify({ 4: '9', 6: 1.5, 8: 1_000_000, 18: 7 }));
    localStorage.setItem('keep.unrelated', 'untouched');
    localStorage.setItem('test.storage-seeded', 'yes');
  });
  await page.goto('/');
  const size = page.getByRole('combobox', { name: 'Grid size' });
  await expect(size).toHaveValue('6');
  await expect(page.locator('.score-strip')).toContainText('Best: none');

  await page.getByRole('button', { name: 'New Game' }).click();
  await loadBoard(page, CODE);
  await clickCard(page, 0);
  await page.reload();
  await expect(size).toHaveValue('4');
  await expect(page.locator('.score-strip')).toContainText('Moves: 0');
  await expect(page.locator('.board-card').first()).toHaveAttribute('data-state', 'closed');

  await loadBoard(page, 'np1-6-7');
  await expect(size).toHaveValue('6');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-0009');
  await page.getByRole('button', { name: 'Load board' }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), PREF_KEY)).toBe('{"size":6}');
  expect(await page.evaluate(() => localStorage.getItem('keep.unrelated'))).toBe('untouched');
  await page.reload();
  await expect(size).toHaveValue('6');
  await expect(page.locator('.board-card').first()).toHaveAttribute('data-state', 'closed');
});

test('best scores persist and respect better, equal and worse results and completed imports', async ({ page }) => {
  await page.goto('/');
  await finishSnapshotRun(page, 9);
  await expect(page.locator('.score-strip')).toContainText('Best: 10');
  await page.reload();
  await expect(page.locator('.score-strip')).toContainText('Best: 10');

  await loadSnapshot(page, completedSnapshot(CODE, 8));
  await expect(page.locator('.score-strip')).toContainText('Best: 10');
  await expect(page.locator('.win-banner')).not.toHaveClass(/is-new-win/);

  await finishSnapshotRun(page, 7);
  await expect(page.locator('.score-strip')).toContainText('Best: 8');
  await finishSnapshotRun(page, 7);
  await expect(page.locator('.score-strip')).toContainText('Best: 8');
  await finishSnapshotRun(page, 8);
  await expect(page.locator('.score-strip')).toContainText('Best: 8');
});

test('storage denial does not prevent play or session bests', async ({ page }) => {
  await page.context().addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => { throw new DOMException('Storage disabled', 'SecurityError'); }
    });
  });
  await page.goto('/');
  await expect(page.locator('.board-card')).toHaveCount(16);
  await finishSnapshotRun(page, 9);
  await expect(page.locator('.score-strip')).toContainText('Best: 10');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.score-strip')).toContainText('Best: 10');
});

async function finishSnapshotRun(page: Page, movesBeforeFinalPair: number): Promise<void> {
  const pairs = pairsForCode(CODE);
  const finalPair = pairs.at(-1);
  if (finalPair === undefined) throw new Error('Test board has no final pair');
  await loadSnapshot(page, progressSnapshot(CODE, pairs.length - 1, movesBeforeFinalPair));
  await page.getByRole('button', { name: 'Resume' }).click();
  const first = finalPair.positions[0];
  const second = finalPair.positions[1];
  await clickCard(page, first);
  await clickCard(page, second);
  await expect(page.locator('.win-banner')).toBeVisible();
}

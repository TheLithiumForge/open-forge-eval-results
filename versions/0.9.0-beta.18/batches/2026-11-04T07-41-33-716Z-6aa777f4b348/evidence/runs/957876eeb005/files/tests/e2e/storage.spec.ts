import { expect, test } from '@playwright/test';
import { cards, loadBoard, openGame, showReproduction } from './deal-actions.ts';
import { completedSnapshot, loadSnapshot, nearlyCompletedSnapshot } from './snapshot-actions.ts';

const KEY = 'neon-pairs.preferences.v1';

test('unfinished imported games record better, equal and worse results; completed imports do not', async ({ page }) => {
  await openGame(page);
  for (const [priorMoves, best] of [[9, 10], [9, 10], [11, 10], [8, 9]] as const) {
    await loadSnapshot(page, nearlyCompletedSnapshot(priorMoves));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    await expect(page.getByText(`Best: ${best}`, { exact: true })).toBeVisible();
  }
  const saved = await page.evaluate(key => localStorage.getItem(key), KEY);
  await loadSnapshot(page, completedSnapshot(8));
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(saved);
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.reload();
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('.card--revealed')).toHaveCount(0);
});

test('saved size survives reload, every load saves size, and reload always starts a fresh deal', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep this'));
  await page.getByLabel('Grid size').selectOption('16');
  await expect(cards(page)).toHaveCount(256);
  const oldCode = await page.getByLabel('Board code', { exact: true }).inputValue();
  await cards(page).first().click();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('16');
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await showReproduction(page);
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue(oldCode);
  await loadBoard(page, 'np1-6-1');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await loadSnapshot(page, completedSnapshot());
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep this');
});

test('malformed and out-of-range saved preferences are ignored while valid records survive', async ({ page }) => {
  await page.goto('/');
  for (const text of ['{', 'null', '{"size":5,"bests":{"4":1000000,"6":18,"8":1.5,"10":-1}}']) {
    await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key: KEY, text });
    await page.reload();
    await expect(page.getByLabel('Grid size')).toHaveValue('4');
    await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  }
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByText('Best: 18', { exact: true })).toBeVisible();
  await page.evaluate(key => localStorage.setItem(key, '{"size":6,"bests":{"6":1e400}}'), KEY);
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
});

for (const failure of ['read', 'write'] as const) {
  test(`storage ${failure} failure keeps play and session records usable`, async ({ page }) => {
    await page.addInitScript(kind => {
      if (kind === 'read') Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } });
      else Storage.prototype.setItem = () => { throw new Error('quota'); };
    }, failure);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openGame(page);
    await loadSnapshot(page, nearlyCompletedSnapshot());
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

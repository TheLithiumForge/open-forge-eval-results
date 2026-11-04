import { expect, test } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, openTools, snapshot } from './helpers.ts';

const KEY = 'neon-pairs.preferences.v1';
const finished = snapshot({ matched: Array.from({ length: 16 }, (_, index) => index), started: true, moves: 8 });
const nearWin = (moves: number) => snapshot({
  matched: Array.from({ length: 16 }, (_, index) => index).filter(index => index !== 1 && index !== 9),
  started: true, moves,
});

test('best scores improve strictly, persist by size and ignore completed imports', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep me'));
  await loadSnapshot(page, finished);
  await expect(page.locator('.status')).toContainText('Best: none');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  for (const [before, best] of [[11, 12], [12, 12], [11, 12], [10, 11]]) {
    if (before === undefined || best === undefined) throw new Error('Missing score vector');
    await loadSnapshot(page, nearWin(before));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(1).click();
    await cards(page).nth(9).click();
    await expect(page.locator('.status')).toContainText(`Best: ${best}`);
  }
  await loadSnapshot(page, finished);
  await expect(page.locator('.status')).toContainText('Best: 11');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.locator('.status')).toContainText('Best: 11');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(page.locator('.status')).toContainText('Best: none');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(page.locator('.status')).toContainText('Moves: 0');
  await loadBoard(page);
  await expect(page.locator('.status')).toContainText('Best: 11');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep me');
});

test('malformed storage and blocked storage leave play usable', async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('neon-pairs.preferences.v1', '{broken'); } catch { /* file origins may deny storage */ }
  });
  await page.goto('/');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await loadSnapshot(page, nearWin(7));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(1).click();
  await cards(page).nth(9).click();
  await expect(page.locator('.status')).toContainText('Best: 8');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.locator('.status')).toContainText('Best: 8');
  expect(errors).toEqual([]);
});

test('a page load keeps preferences but starts another hidden deal', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-8-1');
  await cards(page).first().click();
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await openTools(page);
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-8-1');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toContain('"size":8');
});

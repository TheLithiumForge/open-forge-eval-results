import { expect, test } from '@playwright/test';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { activate, loadBoard, loadSnapshot, progress } from './helpers.ts';

test('better, equal and worse local results retain per-size bests after reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'preserved'));
  for (const [before, expected] of [[11, 12], [11, 12], [12, 12], [9, 10]]) {
    if (before === undefined || expected === undefined) throw new Error('Invalid best fixture.');
    await loadSnapshot(page, progress(7, before));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await activate(page, 12);
    await activate(page, 13);
    await expect(page.getByText(`Best: ${expected}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`Best: ${expected}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  }
  await page.getByLabel('Grid size', { exact: true }).selectOption('8');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await page.getByLabel('Grid size', { exact: true }).selectOption('4');
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('preserved');
});

test('valid loads save size while every reload starts fresh progress', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-10-1');
  await activate(page, 0);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await loadSnapshot(page, progress(1));
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('invalid saved values and storage read/write exceptions keep the game playable', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ size: 5, best: { 4: 1000000, 6: -1, 8: 1.2 } }));
  }, PREFERENCES_KEY);
  await page.goto('/');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Blocked'); } });
  });
  await page.reload();
  await loadBoard(page);
  await activate(page, 0);
  await activate(page, 11);
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { cards, completedSnapshot, finish, loadBoard, loadSnapshot } from './helpers.ts';

test('records better, equal and worse games and retains size and bests after reload', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await finish(page);
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  const firstRecord = await page.evaluate(key => localStorage.getItem(key), PREFERENCES_KEY);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await finish(page);
  expect(await page.evaluate(key => localStorage.getItem(key), PREFERENCES_KEY)).toBe(firstRecord);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await loadSnapshot(page, completedSnapshot('np1-4-1', 8));
  expect(await page.evaluate(key => localStorage.getItem(key), PREFERENCES_KEY)).toBe(firstRecord);
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(cards(page)).toHaveCount(36);
  await page.getByLabel('Grid size', { exact: true }).selectOption('4');
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

test('ignores corrupt preferences, preserves unrelated keys and stays playable without storage', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => {
    localStorage.setItem(key, '{"size":5,"bests":{"4":1000000}}');
    localStorage.setItem('unrelated', 'keep');
  }, PREFERENCES_KEY);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size', { exact: true }).selectOption('8');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage blocked'); } });
  });
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await loadBoard(page);
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

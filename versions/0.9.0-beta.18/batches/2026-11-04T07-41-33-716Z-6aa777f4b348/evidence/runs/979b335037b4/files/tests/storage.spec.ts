import { expect, test } from '@playwright/test';
import { STORAGE_KEY } from '../src/game/session/storage.ts';
import { cards, freezeClock, loadBoard, loadSnapshot, sampleSnapshot, solve } from './helpers.ts';

test('size and best survive reload; better, equal and worse completions respect records', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep me'));
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(800);
  await solve(page);
  await expect(page.locator('.status-strip')).toContainText('Best: 9');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await solve(page);
  await expect(page.locator('.status-strip')).toContainText('Best: 8');
  const original = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await solve(page);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(800);
  await solve(page);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
  await page.getByLabel('Grid size').selectOption('16');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('16');
  await expect(page.locator('.status-strip')).toContainText('Best: none');
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.locator('.status-strip')).toContainText('Best: 8');
  await expect(page.locator('.status-strip')).toContainText('Moves: 0');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep me');
});

test('unavailable storage keeps the game and in-memory best playable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Denied'); } });
  });
  await page.goto('/');
  await loadBoard(page);
  await solve(page);
  await expect(page.locator('.status-strip')).toContainText('Best: 8');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.locator('.status-strip')).toContainText('Best: 8');
});

test('invalid preferences and failed loads cannot overwrite a remembered size', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, '{"size":3,"bests":{"4":"8","6":-1,"16":1000000}}');
  }, STORAGE_KEY);
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.locator('.status-strip')).toContainText('Best: none');
  await page.getByLabel('Grid size').selectOption('8');
  await loadBoard(page, 'np1-5-1');
  await loadSnapshot(page, sampleSnapshot({ extra: true }));
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY)).toEqual({ size: 8, bests: {} });
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
});

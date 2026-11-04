import { expect, test } from '@playwright/test';
import { cards, endingSnapshot, finish, loadBoard, loadSnapshot } from './support.ts';

test('persists only better local bests, current size and unrelated storage', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated-preference', 'keep'));
  for (const [moves, expected] of [[12, 13], [12, 13], [20, 13], [7, 8]]) {
    if (moves === undefined || expected === undefined) throw new Error('Missing fixture.');
    await loadSnapshot(page, endingSnapshot(moves));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(2).click();
    await cards(page).nth(6).click();
    await expect(page.getByText(`Best: ${expected}`, { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Pairs: 0/8', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Grid size', exact: true }).selectOption('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('6');
  await expect(cards(page)).toHaveCount(36);
  await loadBoard(page, 'np1-8-19');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('8');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-preference'))).toBe('keep');
  const saved = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  expect(saved).toBe('{"size":8,"bests":{"4":8}}');
});

for (const failure of ['read', 'write']) {
  test(`storage ${failure} failure leaves the game playable`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (mode === 'read') {
        Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Unavailable'); } });
      } else {
        Storage.prototype.setItem = () => { throw new Error('Quota exceeded'); };
      }
    }, failure);
    await page.goto('/');
    await loadBoard(page);
    await finish(page);
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
  });
}

test('ignores malformed preferences without loading active progress', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('neon-pairs.preferences.v1', '{broken'));
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await cards(page).first().click();
  await page.reload();
  await expect(page.locator('.card--revealed')).toHaveCount(0);
});

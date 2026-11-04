import { expect, test } from '@playwright/test';
import { almostWon, cards, loadBoard, loadState } from './helpers.ts';

test('better, equal and worse local finishes persist best; imports cannot replace it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated-example', 'keep'));
  for (const moves of [11, 7, 7, 10]) {
    await loadState(page, almostWon(moves));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    await expect(page.getByText(`Best: ${moves === 11 ? 12 : 8}`, { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await loadBoard(page, 'np1-6-1');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await loadBoard(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-example'))).toBe('keep');
});

test('malformed saved preferences are ignored and storage failures leave play working', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('neon-pairs.preferences.v1',
    '{"version":1,"size":16,"best":{"4":1000000}}'));
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage blocked for test'); } });
  });
  await page.reload();
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, PREFERENCES_KEY, snapshot } from './gameFixtures.ts';

async function completeImported(page: Page, finalMoves: number) {
  await loadSnapshot(page, { ...snapshot(), matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11),
    moves: finalMoves - 1 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
}

test('keeps per-size better, equal and worse bests through restart, new deals and reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await completeImported(page, 12);
  await expect(page.getByText('Best: 12', { exact: true })).toBeVisible();
  await loadSnapshot(page, snapshot(4, 8));
  await expect(page.getByText('Best: 12', { exact: true })).toBeVisible();
  for (const score of [8, 8, 10]) {
    await completeImported(page, score);
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

test('saves loaded sizes and no progress, while failed loads and unrelated keys remain unchanged', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated-product', 'untouched'));
  await loadBoard(page, 'np1-8-123');
  await cards(page).nth(0).click();
  await loadBoard(page, 'np1-16-00');
  await loadSnapshot(page, { version: 2, boardCode: 'np1-16-1' });
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  await expect(cards(page)).toHaveCount(64);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  const stored = await page.evaluate(key => ({ own: localStorage.getItem(key), other: localStorage.getItem('unrelated-product') }), PREFERENCES_KEY);
  expect(stored.other).toBe('untouched');
  expect(JSON.parse(stored.own ?? '')).toEqual({ size: 8, best: {} });
  await loadSnapshot(page, snapshot(12));
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('12');
  await expect(page.getByText('Pairs: 0/72', { exact: true })).toBeVisible();
});

for (const text of ['{', 'null', '{"size":5,"best":{"4":1e999,"6":-1,"8":1.5,"10":1000000}}']) {
  test(`ignores invalid saved preferences: ${text}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: PREFERENCES_KEY, value: text });
    await page.reload();
    await expect(page.getByLabel('Grid size')).toHaveValue('4');
    await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  });
}

for (const denied of ['access', 'write']) {
  test(`continues play with denied storage ${denied}`, async ({ page }) => {
    await page.addInitScript(mode => {
      if (mode === 'access') Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('denied'); } });
      else Storage.prototype.setItem = () => { throw new Error('quota'); };
    }, denied);
    await page.goto('/');
    await loadBoard(page);
    await completeImported(page, 8);
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  });
}

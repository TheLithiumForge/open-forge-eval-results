import { expect, test } from '@playwright/test';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { almostWon, cards, exported, loadBoard, loadSnapshot, snapshot } from './actions.ts';

test('better, equal and worse finishes retain the per-size best across fresh reloads', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep me'));
  for (const [moves, best] of [[9, 10], [7, 8], [7, 8], [9, 8]]) {
    if (moves === undefined || best === undefined) throw new Error('Invalid best fixture.');
    await loadSnapshot(page, almostWon(moves));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    await expect(page.getByText(`Best: ${best}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`Best: ${best}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    await expect(page.locator('.card-face')).toHaveCount(0);
  }
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await loadBoard(page, 'np1-8-1');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await loadSnapshot(page, snapshot({ boardCode: 'np1-10-1' }));
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
  await page.getByText('Reproduce a game', { exact: true }).click();
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep me');
});

test('completed imports are static, do not write a best and remember their size', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, size: 4, bests: { '4': 20 } }));
    localStorage.setItem('unrelated', 'keep me');
  }, PREFERENCES_KEY);
  await page.reload();
  await loadSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, index) => index), moves: 8, started: true }));
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: 20', { exact: true })).toBeVisible();
  expect(await page.locator('.completion-banner').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  await page.reload();
  await expect(page.getByText('Best: 20', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep me');
});

for (const value of ['{', '{"version":1,"size":5,"bests":{}}',
  '{"version":1,"size":4,"bests":{"4":1000000}}', '{"version":1,"size":4,"bests":{"4":1.5}}']) {
  test(`ignores invalid saved preferences ${value}`, async ({ page }) => {
    await page.addInitScript(({ key, text }) => localStorage.setItem(key, text), { key: PREFERENCES_KEY, text: value });
    await page.goto('/');
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
    await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
    await cards(page).nth(0).click();
    await expect(page.locator('.card-face')).toHaveCount(1);
  });
}

for (const failure of ['access', 'read', 'write']) {
  test(`continues playing when storage ${failure} fails`, async ({ page }) => {
    await page.addInitScript((kind) => {
      const fail = () => { throw new Error('Storage unavailable for acceptance test.'); };
      if (kind === 'access') Object.defineProperty(window, 'localStorage', { get: fail });
      if (kind === 'read') Storage.prototype.getItem = fail;
      if (kind === 'write') Storage.prototype.setItem = fail;
    }, failure);
    await page.goto('/');
    await page.getByLabel('Grid size', { exact: true }).selectOption('6');
    await loadSnapshot(page, almostWon());
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    expect((await exported(page)).matched).toHaveLength(16);
  });
}

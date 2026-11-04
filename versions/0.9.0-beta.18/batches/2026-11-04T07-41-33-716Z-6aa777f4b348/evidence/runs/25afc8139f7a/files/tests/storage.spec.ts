import { expect, test } from '@playwright/test';
import { card, complete, exported, frozenClock, openBoard, preferencesKey } from './helpers.ts';

test('better, equal and worse completions preserve the best after reload', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  await card(page, 0).click();
  await card(page, 1).click();
  await page.clock.runFor(816);
  await complete(page);
  await expect(page.locator('.game-status')).toContainText('Best: 9');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await complete(page);
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  const saved = await page.evaluate((key) => localStorage.getItem(key), preferencesKey);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await complete(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), preferencesKey)).toBe(saved);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await card(page, 0).click();
  await card(page, 1).click();
  await page.clock.runFor(816);
  await complete(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), preferencesKey)).toBe(saved);
  await page.reload();
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  await expect(page.locator('.game-status')).toContainText('Moves: 0');
  await expect(page.locator('.card-closed')).toHaveCount(16);
});

test('size alone survives reload, imported sizes save, unrelated keys survive', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'leave me'));
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await card(page, 0).click();
  const before = await exported(page);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  const after = await exported(page);
  expect(after.started).toBe(false);
  expect(after.board.code).not.toBe(before.board.code);
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('leave me');
  await page.getByLabel('Board code', { exact: true }).fill('np1-8-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
});

for (const text of ['{broken', '{"size":5,"bests":{"4":-1,"6":1000000}}', 'null']) {
  test(`corrupt preferences are ignored: ${text}`, async ({ page }) => {
    await page.addInitScript(({ key, text }) => localStorage.setItem(key, text), { key: preferencesKey, text });
    await page.goto('/');
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
    await expect(page.locator('.game-status')).toContainText('Best: none');
    await card(page, 0).click();
    await expect(card(page, 0)).toHaveAttribute('aria-label', /revealed$/);
  });
}

test('throwing storage keeps the full game playable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  });
  await openBoard(page);
  await complete(page);
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.locator('.card-closed')).toHaveCount(16);
});

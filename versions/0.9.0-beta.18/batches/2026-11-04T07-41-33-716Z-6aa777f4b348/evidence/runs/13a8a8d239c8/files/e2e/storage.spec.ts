import { test, expect } from '@playwright/test';
import { loadBoard, winPairs } from './helpers.ts';

const fixedTime = new Date('2026-11-04T00:00:00.000Z');

test('remembers grid size across reload and keeps active progress in memory only', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('neon-pairs.preferences.v1') === null) {
      localStorage.setItem('neon-pairs.preferences.v1', '{"gridSize":8}');
      localStorage.setItem('third-party-key', 'keep');
    }
  });
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  await loadBoard(page, 'np1-8-1');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.locator('.memory-card')).toHaveCount(36);
  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await expect(page.locator('.game-summary')).toContainText('Moves: 0');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.memory-card')).toHaveCount(36);
  await expect(page.locator('.game-summary')).toContainText('Pairs: 0/18');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, closed' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual([
    'neon-pairs.preferences.v1', 'third-party-key',
  ]);
  expect(await page.evaluate(() => localStorage.getItem('third-party-key'))).toBe('keep');
});

test('saves only better scores across better, equal, worse, and restart outcomes', async ({ page }) => {
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await page.addInitScript(() => localStorage.setItem('third-party-key', 'keep'));
  await page.goto('/');
  const code = 'np1-4-1';
  const cards = page.locator('.memory-card');
  const clickIndex = async (index: number) => cards.nth(index).evaluate((element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error('A card should be a button.');
    element.click();
  });

  await loadBoard(page, code);
  await clickIndex(0);
  await clickIndex(1);
  await page.clock.runFor(800);
  await clickIndex(2);
  await clickIndex(3);
  await page.clock.runFor(800);
  await winPairs(page, code);
  await expect(page.locator('.game-summary')).toContainText('Moves: 10');
  await expect(page.locator('.game-summary')).toContainText('Best: 10');

  await page.reload();
  await expect(page.locator('.game-summary')).toContainText('Best: 10');
  await loadBoard(page, code);
  await winPairs(page, code);
  await expect(page.locator('.game-summary')).toContainText('Best: 8');

  await page.getByRole('button', { name: 'Restart' }).click();
  await winPairs(page, code);
  await expect(page.locator('.game-summary')).toContainText('Best: 8');

  await page.getByRole('button', { name: 'Restart' }).click();
  await clickIndex(0);
  await clickIndex(1);
  await page.clock.runFor(800);
  await clickIndex(2);
  await clickIndex(3);
  await page.clock.runFor(800);
  await winPairs(page, code);
  await expect(page.locator('.game-summary')).toContainText('Moves: 10');
  await expect(page.locator('.game-summary')).toContainText('Best: 8');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.best.v1'))).toBe('{"4":8}');
  expect(await page.evaluate(() => localStorage.getItem('third-party-key'))).toBe('keep');
});

test('ignores malformed stored preferences and remains playable if storage is denied', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('neon-pairs.preferences.v1', '{"gridSize":5}');
    localStorage.setItem('neon-pairs.best.v1', '{"4":"2","6":1000000,"8":2.5,"32":1}');
  });
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.locator('.game-summary')).toContainText('Best: none');

  const denied = await page.context().newPage();
  await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    configurable: true, get: () => { throw new Error('Storage is unavailable.'); },
  }));
  try {
    await denied.goto('/');
    await denied.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
    await expect(denied.getByRole('button', { name: /Row 1, column 1, .*revealed/ })).toBeVisible();
  } finally {
    await denied.close();
  }

  const writeDenied = await page.context().newPage();
  await writeDenied.addInitScript(() => {
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('neon-pairs.')) throw new Error('Storage is read-only.');
      nativeSet.call(this, key, value);
    };
  });
  try {
    await writeDenied.goto('/');
    await writeDenied.getByLabel('Grid size').selectOption('6');
    await expect(writeDenied.getByLabel('Grid size')).toHaveValue('6');
    await writeDenied.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
    await expect(writeDenied.getByRole('button', { name: /Row 1, column 1, .*revealed/ })).toBeVisible();
  } finally {
    await writeDenied.close();
  }
});

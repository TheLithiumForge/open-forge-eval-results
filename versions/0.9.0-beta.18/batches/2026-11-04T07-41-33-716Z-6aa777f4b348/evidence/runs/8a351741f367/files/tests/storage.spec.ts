import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { card, completedText, exported, loadBoard, loadSnapshot, nearlyCompleteText } from './gameActions.ts';

async function winImported(page: Page, moves: number): Promise<void> {
  await loadSnapshot(page, nearlyCompleteText(moves));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await card(page, 12).click();
  await card(page, 13).click();
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
}

test('records better scores, retains equal/worse records and keeps them after reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('unrelated-example', 'keep me'); });
  await winImported(page, 10);
  await expect(page.locator('.game-status')).toContainText('Best: 11');
  await loadSnapshot(page, completedText(8));
  await expect(page.locator('.game-status')).toContainText('Best: 11');
  await winImported(page, 7);
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  await winImported(page, 7);
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  await winImported(page, 9);
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  await loadSnapshot(page, completedText(7 + 1));
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  await page.reload();
  await expect(page.locator('.game-status')).toContainText('Best: 8');
  await expect(page.locator('.game-status')).toContainText('Moves: 0');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-example'))).toBe('keep me');
  await loadBoard(page, 'np1-6-1');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  const fresh = await exported(page);
  expect(fresh.board.code).not.toBe('np1-6-1');
  expect(fresh.started).toBe(false);
  await loadSnapshot(page, JSON.stringify({ version: 1, boardCode: 'np1-8-1', matched: [],
    selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false }));
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await loadBoard(page, 'np1-8-0');
  await loadSnapshot(page, '{');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
});

for (const text of ['{', 'null', '{"size":5,"best":{"4":1000000}}',
  '{"size":"16","best":{"4":-1,"6":1.5,"8":"8","10":null}}']) {
  test(`ignores invalid saved preference ${text}`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => { localStorage.setItem(key, value); }, { key: PREFERENCES_KEY, value: text });
    await page.goto('/');
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
    await expect(page.locator('.game-status')).toContainText('Best: none');
    await card(page, 0).click();
    await expect(page.locator('.card--revealed')).toHaveCount(1);
  });
}

test('accepts the move cap in saved scores and discards out-of-range records', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ size: 4, best: { 4: 999999, 6: 1000000, 8: 0.5 } }));
  }, PREFERENCES_KEY);
  await page.goto('/');
  await expect(page.locator('.game-status')).toContainText('Best: 999999');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(page.locator('.game-status')).toContainText('Best: none');
});

for (const failure of ['read', 'write'] as const) {
  test(`storage ${failure} failure leaves the complete game playable`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (mode === 'read') Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
      else Storage.prototype.setItem = () => { throw new Error('quota exceeded'); };
    }, failure);
    const errors: string[] = [];
    page.on('pageerror', (error) => { errors.push(error.message); });
    await page.goto('/');
    await winImported(page, 7);
    await expect(page.locator('.game-status')).toContainText('Best: 8');
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.locator('.game-status')).toContainText('Moves: 0');
    expect(errors).toEqual([]);
  });
}

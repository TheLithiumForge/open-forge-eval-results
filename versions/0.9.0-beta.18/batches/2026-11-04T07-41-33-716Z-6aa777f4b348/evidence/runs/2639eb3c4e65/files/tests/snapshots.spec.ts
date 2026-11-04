import { expect, test } from '@playwright/test';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { cards, finish, freezeTime, importSnapshot, loadBoard, snapshot } from './helpers.ts';

test('imports paused, blocks activation, resumes remembered focus and preserves exact remaining time', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/');
  await importSnapshot(page, snapshot());
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  await cards(page).nth(3).click();
  await expect(cards(page).nth(3)).toHaveClass(/closed/);
  await expect(page.getByText('Time: 0:01', { exact: true })).toBeVisible();
  await cards(page).nth(1).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(cards(page).nth(1)).toHaveClass(/revealed/);
  await page.clock.runFor(1);
  await cards(page).nth(3).click();
  await expect(cards(page).nth(1)).toHaveClass(/closed/);
  await expect(cards(page).nth(3)).toHaveClass(/revealed/);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"elapsedMs": 1800/);
  const draft = await page.getByLabel('Snapshot JSON').inputValue();
  await page.getByLabel('Snapshot JSON').fill('{');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(cards(page).nth(3)).toHaveClass(/revealed/);
  await importSnapshot(page, draft);
  await expect(cards(page).nth(3)).toHaveClass(/revealed/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('completed imports are static, never update best; unfinished imports can earn a best', async ({ page }) => {
  await page.goto('/');
  await importSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, i) => i), selection: { kind: 'closed' }, moves: 8 }));
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await importSnapshot(page, snapshot({ matched: [0, 11, 1, 9, 2, 6, 3, 7, 4, 5, 8, 15, 10, 14], selection: { kind: 'closed' }, moves: 7 }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.locator('.win-banner')).toHaveClass(/celebrate/);
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

test('persists size and better/equal/worse records, leaving unrelated storage untouched', async ({ page }) => {
  test.setTimeout(60000);
  await freezeTime(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(800);
  await finish(page);
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  await loadBoard(page);
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  for (const moves of [8, 9]) {
    await importSnapshot(page, snapshot({ matched: [0, 11, 1, 9, 2, 6, 3, 7, 4, 5, 8, 15, 10, 14], selection: { kind: 'closed' }, moves: moves - 1 }));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(12).click();
    await cards(page).nth(13).click();
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  }
  await page.getByLabel('Grid size').selectOption('6');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  expect(await page.evaluate(key => localStorage.getItem(key), PREFERENCES_KEY)).toContain('"4":8');
});

test('storage failures do not prevent playing or changing deals', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
  });
  await page.goto('/');
  await loadBoard(page);
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

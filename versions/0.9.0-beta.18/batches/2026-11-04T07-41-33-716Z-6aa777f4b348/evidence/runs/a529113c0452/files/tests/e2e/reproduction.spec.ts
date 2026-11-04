import { expect, test } from '@playwright/test';
import { cards, completed, exportProgress, loadBoard, loadProgress, nearWin, openGame, stat } from './support.ts';

test('board controls trim, preserve drafts, validate and retain focus', async ({ page }) => {
  await openGame(page, true);
  await loadBoard(page, '  np1-6-1  ');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByLabel('Board code')).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON')).toHaveAttribute('maxlength', '65536');
  const button = page.getByRole('button', { name: 'Load board', exact: true });
  await expect(button).toBeFocused();
  await page.getByLabel('Board code').fill('np1-4-01');
  await cards(page).nth(0).click();
  await page.clock.runFor(1100);
  await expect(page.getByLabel('Board code')).toHaveValue('np1-4-01');
  await button.click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(button).toBeFocused();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.card--revealed')).toHaveCount(1);
  await expect(page.getByLabel('Board code')).toHaveValue('np1-4-01');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.size'))).toBe('6');
  await page.getByLabel('Snapshot JSON').fill('{"version":2}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{"version":2}');
  await expect(page.locator('.card--revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code')).toHaveValue('np1-6-1');
});

test('snapshot import pauses mismatch and Resume preserves board focus and remaining time', async ({ page }) => {
  await openGame(page, true);
  const text = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true });
  await loadProgress(page, text);
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await cards(page).nth(1).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.clock.runFor(5000);
  expect((await exportProgress(page)).elapsedMs).toBe(1500);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  const exported = await exportProgress(page);
  expect(exported.elapsedMs).toBe(1800);
  expect(exported.selection).toEqual({ kind: 'closed' });
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
});

test('completed import is static and unscored; resumed unfinished win sets best', async ({ page }) => {
  await openGame(page, true);
  await loadProgress(page, completed());
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(stat(page, 'Best')).toHaveText('Best: none');
  await loadProgress(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(2).click();
  await cards(page).nth(6).click();
  await expect(stat(page, 'Best')).toHaveText('Best: 8');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
  await page.clock.runFor(700);
  expect(await page.locator('.win-banner').evaluate((element) => element.getAnimations().length)).toBe(0);
});

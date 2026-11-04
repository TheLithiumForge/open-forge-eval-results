import { expect, test } from '@playwright/test';
import { cards, frozen, game, loadBoard, loadSnapshot, nearWin, readSnapshot } from './gameDriver.ts';

const pending = { ...game(), matched: [0, 11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 } as const,
  moves: 2, elapsedMs: 1500, started: true };

test('snapshot pauses progress, preserves remaining time, and resumes at remembered focus', async ({ page }) => {
  await frozen(page);
  await loadSnapshot(page, pending);
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot' })).toBeFocused();
  await cards(page).nth(3).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.clock.runFor(1000);
  expect(await readSnapshot(page)).toEqual(pending);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  expect((await readSnapshot(page)).selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
  await page.clock.runFor(1);
  expect(await readSnapshot(page)).toMatchObject({ elapsedMs: 1800, selection: { kind: 'closed' } });
});

test('completed imports stay static and do not write a best, later wins do', async ({ page }) => {
  await page.goto('/');
  const completed = { ...nearWin(8), matched: Array.from({ length: 16 }, (_, i) => i) };
  await loadSnapshot(page, completed);
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await loadSnapshot(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.locator('.win-banner')).toHaveClass(/celebrate/);
  await expect(page.getByText('Moves: 8', { exact: true })).toBeVisible();
});

test('export keeps active play running and caps do not prevent completion', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await page.clock.runFor(1250);
  expect((await readSnapshot(page)).elapsedMs).toBe(1250);
  await page.clock.runFor(750);
  expect((await readSnapshot(page)).elapsedMs).toBe(2000);
  await loadSnapshot(page, { ...nearWin(999999), elapsedMs: 359999999 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { card, exportState, freezeClock, loadBoard, loadSnapshot, nearWin } from './helpers.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });
test('board drafts survive play, trim on load, validate before replacing and reset on restart', async ({ page }) => {
  await loadBoard(page);
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-2');
  await card(page, 0).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-2');
  await page.getByLabel('Board code', { exact: true }).fill('np1-04-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByText('Invalid board code.', { exact: true }).first()).toBeVisible();
  await expect(card(page, 0)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-04-1');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await loadBoard(page, '  np1-6-42  ');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-42');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
});
test('a pending snapshot stays paused, allows focus movement, then resumes its remaining active time', async ({ page }) => {
  await freezeClock(page);
  const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true };
  await loadSnapshot(page, example);
  await expect(page.getByText('Loaded snapshot. Select Resume to continue.', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await card(page, 4).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(card(page, 5)).toBeFocused();
  await expect(card(page, 5)).toHaveAccessibleName(/closed$/);
  await page.clock.runFor(5000);
  expect((await exportState(page)).elapsedMs).toBe(1500);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(card(page, 5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(card(page, 1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(card(page, 1)).toHaveAccessibleName(/closed$/);
  expect((await exportState(page)).elapsedMs).toBe(1800);
});
test('invalid snapshot preserves both game and draft; exporting is readable and does not interrupt time', async ({ page }) => {
  await loadBoard(page);
  await freezeClock(page);
  await card(page, 0).click();
  await loadSnapshot(page, { version: 1, extra: true });
  await expect(page.getByText('Invalid snapshot.', { exact: true }).first()).toBeVisible();
  await expect(card(page, 0)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue('{"version":1,"extra":true}');
  expect((await exportState(page)).elapsedMs).toBe(0);
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await page.clock.runFor(1500);
  expect((await exportState(page)).elapsedMs).toBe(1500);
});
test('completed imports remain static and never write best; completing unfinished imports records better scores', async ({ page }) => {
  await loadSnapshot(page, nearWin(9));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await card(page, 0).click();
  await card(page, 11).click();
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
  expect(await page.locator('.win-banner').evaluate((element) => ({
    duration: getComputedStyle(element).animationDuration,
    iterations: getComputedStyle(element).animationIterationCount,
  }))).toEqual({ duration: '0.6s', iterations: '1' });
  await expect.poll(() => page.locator('.win-banner').evaluate((element) => element.getAnimations().length)).toBe(0);
  const complete = { ...nearWin(8), matched: Array.from({ length: 16 }, (_, index) => index) };
  await loadSnapshot(page, complete);
  await expect(page.getByText('Loaded completed snapshot.', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  for (const moves of [9, 11, 7]) {
    await loadSnapshot(page, nearWin(moves));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await card(page, 0).click();
    await card(page, 11).click();
    await expect(page.getByText(`Best: ${moves === 7 ? 8 : 10}`, { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

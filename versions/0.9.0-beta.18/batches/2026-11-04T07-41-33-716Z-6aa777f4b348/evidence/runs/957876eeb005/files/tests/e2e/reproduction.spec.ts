import { expect, test } from '@playwright/test';
import { cards, freezeClock, loadBoard, openGame, SAMPLE_CODE } from './deal-actions.ts';
import { exportState, loadSnapshot, mismatchSnapshot, nearlyCompletedSnapshot } from './snapshot-actions.ts';

test('board control trims only on load, preserves edited drafts during play, and keeps button focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await loadBoard(page, ' np1-6-1 ');
  const draft = page.getByLabel('Board code', { exact: true });
  await expect(draft).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON')).toHaveAttribute('maxlength', '65536');
  await expect(draft).toHaveValue('np1-6-1');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await draft.fill('np1-4-2');
  await cards(page).first().click();
  await expect(draft).toHaveValue('np1-4-2');
  await expect(cards(page)).toHaveCount(36);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(draft).toHaveValue('np1-6-1');
  await expect(cards(page).first()).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(draft).not.toHaveValue('np1-6-1');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
});

test('invalid loads retain game, entered drafts, remembered focus and saved size', async ({ page }) => {
  await freezeClock(page);
  await openGame(page, 'np1-6-1');
  await cards(page).nth(5).click();
  const before = await exportState(page);
  await page.getByLabel('Board code', { exact: true }).fill('np1-04-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-04-1');
  await expect(cards(page).nth(5)).toHaveAttribute('tabindex', '0');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByLabel('Snapshot JSON').fill('{"version":1}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{"version":1}');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  expect(await exportState(page)).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toContain('"size":6');
});

test('export is readable whole-millisecond progress and keeps a running mismatch unchanged', async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(799);
  const state = await exportState(page);
  expect(state.elapsedMs).toBe(799);
  expect(state.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/\n  "version": 1,/);
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(SAMPLE_CODE);
});

test('unfinished snapshot is frozen until Resume, which focuses the remembered card', async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await loadSnapshot(page, mismatchSnapshot);
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(cards(page).first()).toHaveAttribute('tabindex', '0');
  await cards(page).nth(3).click();
  await page.clock.runFor(5000);
  expect((await exportState(page)).elapsedMs).toBe(1500);
  await cards(page).nth(3).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(page.locator('.card--revealed')).toHaveCount(4);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  expect((await exportState(page)).elapsedMs).toBe(1800);
});

test('capped moves and elapsed display remain capped while play can still finish', async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await loadSnapshot(page, { ...nearlyCompletedSnapshot(999999), elapsedMs: 359999999 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(2000);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Game complete' })).toContainText('999999 moves and 5999:59.');
});

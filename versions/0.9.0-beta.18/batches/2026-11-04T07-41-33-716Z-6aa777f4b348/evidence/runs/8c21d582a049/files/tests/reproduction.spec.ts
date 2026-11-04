import { expect, test } from '@playwright/test';
import { cards, exported, live, loadBoard, loadSnapshot, openGame, snapshot, statistics, tools } from './game.ts';

test('native reproduction controls preserve drafts, errors and action focus (C01–C09, C11, C13)', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size', { exact: true }).locator('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await tools(page);
  const code = page.getByLabel('Board code', { exact: true });
  const json = page.getByLabel('Snapshot JSON', { exact: true });
  await expect(code).toHaveAttribute('maxlength', '32');
  await expect(json).toHaveAttribute('maxlength', '65536');
  await loadBoard(page);
  await code.fill('draft'); await cards(page).nth(0).click(); await page.clock.runFor(1000);
  await expect(code).toHaveValue('draft');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid board code.');
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid board code.');
  await expect(code).toHaveValue('draft');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await json.fill('{"extra":true}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid snapshot.');
  await expect(json).toHaveValue('{"extra":true}');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  const progress = await exported(page);
  expect(progress.selection).toEqual({ kind: 'one', index: 0 });
  expect(progress.elapsedMs).toBe(1000);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(code).toHaveValue('np1-4-1');
  await expect(cards(page).first()).toHaveAttribute('tabindex', '0');
  await code.fill(' np1-6-1 ');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(code).toHaveValue('np1-6-1');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
});

test('unfinished snapshots pause both clocks, permit focus and Resume restores focus (C09–C10)', async ({ page }) => {
  await openGame(page);
  await loadSnapshot(page, { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true });
  await expect(live(page)).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await cards(page).nth(3).click(); await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.clock.runFor(10000);
  const before = await exported(page);
  expect(before.elapsedMs).toBe(1500);
  expect(before.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 300 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
  expect((await exported(page)).elapsedMs).toBe(1800);
});

test('completed imports remain static and caps do not block play (C12, R05, R07)', async ({ page }) => {
  await openGame(page);
  await loadSnapshot(page, snapshot());
  await expect(live(page)).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(statistics(page)).toContainText('Best: none');
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await loadSnapshot(page, { ...snapshot(4, 999999, false), elapsedMs: 359999999 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(11).click();
  await expect(statistics(page)).toContainText('Moves: 999999');
  await expect(statistics(page)).toContainText('Time: 5999:59');
  await expect(statistics(page)).toContainText('Pairs: 8/8');
  await expect(statistics(page)).toContainText('Best: 999999');
});

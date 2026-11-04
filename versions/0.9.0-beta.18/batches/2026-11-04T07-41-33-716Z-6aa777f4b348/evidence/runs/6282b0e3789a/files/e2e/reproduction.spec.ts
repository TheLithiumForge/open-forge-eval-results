import { expect, test } from '@playwright/test';
import { cards, exportValue, freezeClock, live, loadBoard, loadSnapshot, openTools, snapshot } from './gameFixtures.ts';

test('documents exact controls, preserves drafts and rejects invalid loads without replacing play', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size').locator('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await loadBoard(page, '  np1-4-1  ');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-01');
  await cards(page).nth(0).click();
  await page.clock.runFor(1000);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid board code.');
  await expect(cards(page)).toHaveCount(16);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await loadSnapshot(page, { version: 2 });
  await expect(live(page)).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue('{"version":2}');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
});

test('exports readable whole milliseconds without pausing and restores unfinished progress paused', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(123);
  await expect(exportValue(page)).resolves.toMatchObject({ version: 1, elapsedMs: 123, selection: { remainingMs: 677 } });
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(/\n  "version": 1,/);
  await page.clock.runFor(677);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  const value = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true };
  await loadSnapshot(page, value);
  await expect(live(page)).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await cards(page).nth(3).click();
  await expect(cards(page).nth(3)).toHaveAccessibleName(/closed$/);
  await cards(page).nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(10000);
  await expect(exportValue(page)).resolves.toMatchObject(value);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
  await expect(exportValue(page)).resolves.toMatchObject({ elapsedMs: 1800, moves: 2 });
});

test('completed imports are static, do not record best and contain no replay controls', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, snapshot(6));
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(live(page)).toHaveText('Loaded completed snapshot.');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: /replay/i })).toHaveCount(0);
  await openTools(page);
  await expect(exportValue(page)).resolves.toMatchObject(snapshot(6));
});

test('move and time caps remain playable through an imported final pair', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadSnapshot(page, { ...snapshot(), matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11),
    moves: 999999, elapsedMs: 359999999 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1000);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
});

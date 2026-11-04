import { expect, test } from '@playwright/test';
import { cards, exportSnapshot, loadBoard, loadSnapshot, openTools, pauseClock, snapshot } from './helpers.ts';

test('board drafts, exact validation, sizes and successful-load focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
  await loadBoard(page, '  np1-6-1  ');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-1');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-01');
  await cards(page).first().click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.locator('[aria-live]')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-1');
  await expect(cards(page).first()).toHaveAttribute('tabindex', '0');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
});

test('import pauses both clocks, blocks activation, preserves navigation and resumes with focus', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadSnapshot(page, snapshot({ matched: [0, 11], started: true, moves: 2, elapsedMs: 1500,
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 } }));
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  const imported = await exportSnapshot(page);
  await page.clock.runFor(5000);
  await cards(page).nth(3).click();
  expect(await exportSnapshot(page)).toEqual(imported);
  await cards(page).nth(3).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(32);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect((await exportSnapshot(page)).elapsedMs).toBe(1831);
});

test('invalid snapshot keeps draft, current progress and saved preferences', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  const stored = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  await loadSnapshot(page, snapshot({ boardCode: 'np1-8-1', extra: true }));
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(/extra/);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(stored);
});

test('export is readable JSON, keeps focus and needs no clipboard', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).first().click();
  await openTools(page);
  const value = await exportSnapshot(page);
  expect(value).toMatchObject({ version: 1, boardCode: 'np1-4-1', started: true, selection: { kind: 'one', index: 0 } });
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  expect(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue()).toContain('\n  "version": 1');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
});

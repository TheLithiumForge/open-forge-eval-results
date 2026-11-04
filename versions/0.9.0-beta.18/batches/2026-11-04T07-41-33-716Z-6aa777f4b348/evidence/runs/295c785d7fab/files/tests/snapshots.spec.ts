import { expect, test } from '@playwright/test';
import { activate, exported, freezeTime, loadBoard, loadSnapshot, MISMATCH, progress } from './helpers.ts';

test('unfinished import pauses input and clocks, allows arrows, then resumes remembered focus', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, JSON.stringify(MISMATCH));
  await expect(page.locator('.load-notice')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await freezeTime(page);
  await page.clock.runFor(5000);
  await activate(page, 3);
  expect((await exported(page)).selection).toEqual(MISMATCH.selection);
  expect((await exported(page)).elapsedMs).toBe(1500);
  await page.locator('.card').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.card').nth(4)).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).dispatchEvent('click');
  await expect(page.locator('.card').nth(4)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  expect((await exported(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  expect((await exported(page)).elapsedMs).toBe(1800);
});

test('completed imports stay static and preserve bests; resumed unfinished wins save locally', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, progress(8));
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await loadSnapshot(page, progress(7, 9));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await activate(page, 12);
  await activate(page, 13);
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
  await loadSnapshot(page, progress(8));
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
});

test('invalid drafts preserve progress, preferences, and correction text', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, '  np1-6-1  ');
  await activate(page, 0);
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-notice')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  const invalid = JSON.stringify({ ...MISMATCH, extra: true });
  await loadSnapshot(page, invalid);
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(invalid);
  const state = await exported(page);
  expect(state.board.code).toBe('np1-6-1');
  expect(state.selection).toEqual({ kind: 'one', index: 0 });
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
});

test('drafts survive card actions; controls retain focus and expose limits', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await loadBoard(page);
  await page.getByLabel('Board code', { exact: true }).fill('edited draft');
  await activate(page, 0);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('edited draft');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
  for (const name of ['Export snapshot', 'Restart', 'New Game']) {
    const button = page.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toBeFocused();
  }
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(/^np1-4-[1-9]\d*$/);
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('.card').first()).toHaveAttribute('tabindex', '0');
});

test('move and elapsed caps retain playable turns and completion', async ({ page }) => {
  await page.goto('/');
  const text: unknown = JSON.parse(progress(7, 999999));
  if (typeof text !== 'object' || text === null) throw new Error('Invalid fixture.');
  await loadSnapshot(page, JSON.stringify({ ...text, elapsedMs: 359999999 }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await activate(page, 12);
  await activate(page, 13);
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await expect(page.locator('.win-banner')).toContainText('999999 moves in 5999:59.');
});

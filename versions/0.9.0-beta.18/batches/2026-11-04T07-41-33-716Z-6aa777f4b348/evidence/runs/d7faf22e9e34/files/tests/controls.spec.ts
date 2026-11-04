import { expect, test } from '@playwright/test';
import { exported, loadBoard, loadSnapshot, reproduce, reveal, snapshot, start } from './helpers.ts';

test('native controls, limits, drafts and exact load errors preserve the game', async ({ page }) => {
  await start(page, true);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  expect(await page.getByLabel('Grid size').locator('option').allTextContents())
    .toEqual(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await loadBoard(page);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  const draft = page.getByRole('textbox', { name: 'Snapshot JSON', exact: true });
  await expect(draft).toHaveAttribute('maxlength', '65536');
  await page.getByLabel('Board code', { exact: true }).fill('draft to retain');
  await reveal(page, 0);
  await page.clock.runFor(1200);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft to retain');
  await page.getByRole('button', { name: 'Load board', exact: true }).click({ force: true });
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  expect((await exported(page)).selection).toEqual({ kind: 'one', index: 0 });
  await draft.fill('{invalid');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click({ force: true });
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(draft).toHaveValue('{invalid');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
});

test('deal actions and exports retain control focus and reset board memory', async ({ page }) => {
  await start(page);
  await loadBoard(page);
  for (const name of ['New Game', 'Restart', 'Load board', 'Export snapshot']) {
    await page.locator('.card').nth(7).focus();
    const button = page.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    if (name !== 'Export snapshot') await expect(page.locator('.card[tabindex="0"]')).toHaveAccessibleName('Row 1, column 1, closed');
  }
  await page.getByLabel('Board code', { exact: true }).fill('  np1-6-17  ');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-17');
  await expect(page.locator('.card')).toHaveCount(36);
  const same = await page.getByLabel('Board code', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(same);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue(same);
});

test('export keeps a live game running and completed imports remain static', async ({ page }) => {
  await start(page, true);
  await loadBoard(page);
  await reveal(page, 0);
  await reveal(page, 1);
  await page.clock.runFor(799);
  const state = await exported(page);
  expect(state.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
  expect(Number.isInteger(state.elapsedMs)).toBe(true);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  await loadSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, index) => index),
    moves: 8, elapsedMs: 61500, started: true }));
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await expect(page.getByText('Finished in 8 moves and 1:01.', { exact: true })).toBeVisible();
});

test('pristine snapshot stays unstarted after Resume until its first activation', async ({ page }) => {
  await start(page, true);
  await loadSnapshot(page, snapshot());
  await page.clock.runFor(2000);
  await reveal(page, 0);
  expect((await exported(page)).started).toBe(false);
  await page.getByRole('button', { name: 'Resume', exact: true }).click({ force: true });
  await page.clock.runFor(2000);
  expect((await exported(page)).elapsedMs).toBe(0);
  await reveal(page, 0);
  await page.clock.runFor(1000);
  expect((await exported(page)).elapsedMs).toBe(1000);
  await reproduce(page);
});

import { expect, test } from '@playwright/test';
import { cards, exported, frozen, loadBoard, loadSnapshot, snapshot, tools } from './actions.ts';

test('native reproduction tools preserve drafts, focus and valid state on errors', async ({ page }) => {
  await frozen(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  expect(await page.getByRole('option').allTextContents()).toEqual(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await tools(page);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
  await loadBoard(page, '  np1-4-1  ');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByLabel('Board code', { exact: true }).fill('draft');
  await cards(page).nth(0).click();
  await page.clock.runFor(1250);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft');
  await expect(page.locator('.card-face')).toHaveCount(1);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill('{}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue('{}');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  const saved = await exported(page);
  expect(saved.elapsedMs).toBe(1250);
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  expect((await exported(page)).started).toBe(false);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
});

test('unfinished imports pause the mismatch and resume at the remembered board focus', async ({ page }) => {
  await frozen(page);
  await loadSnapshot(page, snapshot({ matched: [0, 11], moves: 2, elapsedMs: 1500, started: true,
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 } }));
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await page.clock.runFor(5000);
  await cards(page).nth(3).click({ force: true });
  await cards(page).nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(2)).toBeFocused();
  expect((await exported(page)).elapsedMs).toBe(1500);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(2)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  const waiting = await exported(page);
  expect(waiting.selection).toMatchObject({ remainingMs: 1 });
  expect(waiting.elapsedMs).toBe(1799);
  await page.clock.runFor(1);
  await expect(page.locator('.card-face')).toHaveCount(2);
  expect((await exported(page)).selection).toEqual({ kind: 'closed' });
});

test('unstarted imports still pause and malformed or oversized drafts never replace them', async ({ page }) => {
  await frozen(page);
  await loadSnapshot(page, snapshot());
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  for (const text of [snapshot({ extra: 1 }), snapshot({ matched: [0] }), snapshot({ moves: 1000000 }),
    snapshot({ selection: { kind: 'one', index: 0 } }), '"' + 'é'.repeat(32768) + '"']) {
    await loadSnapshot(page, text);
    await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
    await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(text);
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await expect(page.locator('.card-face')).toHaveCount(0);
  }
});

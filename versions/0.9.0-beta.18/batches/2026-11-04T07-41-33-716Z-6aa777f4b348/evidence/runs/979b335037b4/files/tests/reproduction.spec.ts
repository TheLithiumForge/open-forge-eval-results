import { expect, test } from '@playwright/test';
import { cards, exportedState, freezeClock, loadBoard, loadSnapshot, sampleSnapshot } from './helpers.ts';

test('drafts survive play and invalid imports; loads update size and preserve control focus', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const input = page.getByLabel('Board code', { exact: true });
  await input.fill('my draft');
  await cards(page).nth(0).click();
  await expect(input).toHaveValue('my draft');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(input).toHaveValue('my draft');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await loadSnapshot(page, '{"invalid":true}');
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{"invalid":true}');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await loadBoard(page, 'np1-6-1');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  expect((await exportedState(page)).board.code).toBe('np1-6-1');
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
  await loadSnapshot(page);
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
});

test('unfinished snapshots pause both clocks, block all activation, retain movement and resume focus', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadSnapshot(page);
  await cards(page).nth(3).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.clock.runFor(5000);
  const state = await exportedState(page);
  expect(state.elapsedMs).toBe(1500);
  expect(state.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 300 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  expect((await exportedState(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect((await exportedState(page)).selection.kind).toBe('closed');
});

test('completed imports stay static and do not write a best; unfinished wins do', async ({ page }) => {
  await page.goto('/');
  const complete = sampleSnapshot({ matched: Array.from({ length: 16 }, (_, i) => i),
    selection: { kind: 'closed' }, moves: 8 });
  await loadSnapshot(page, complete);
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.status-strip')).toContainText('Best: none');
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await loadSnapshot(page, sampleSnapshot({ matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 8 && i !== 15),
    selection: { kind: 'closed' }, moves: 7 }));
  await page.getByRole('button', { name: 'Resume' }).click();
  await cards(page).nth(8).click();
  await cards(page).nth(15).click();
  await expect(page.locator('.win-banner')).toHaveClass(/celebrate/);
  await expect(page.locator('.status-strip')).toContainText('Best: 8');
  await page.reload();
  await expect(page.locator('.status-strip')).toContainText('Best: 8');
  await expect(page.locator('.status-strip')).toContainText('Moves: 0');
});

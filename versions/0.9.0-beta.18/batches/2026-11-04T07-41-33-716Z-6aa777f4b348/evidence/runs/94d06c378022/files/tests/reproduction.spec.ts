import { expect, test } from '@playwright/test';
import { makeSnapshot, loadBoard, loadSnapshot, pairsForCode, clickCard } from './helpers.ts';

const CODE = 'np1-4-1';

test('native controls, invalid board drafts and successful board loads', async ({ page }) => {
  await page.goto('/');
  const size = page.getByRole('combobox', { name: 'Grid size' });
  await expect(size.locator('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  expect(await page.locator('.reproduction-panel').evaluate((element) => element instanceof HTMLDetailsElement && element.open)).toBe(false);

  await loadBoard(page, CODE);
  const boardInput = page.getByLabel('Board code', { exact: true });
  await expect(boardInput).toHaveValue(CODE);
  await expect(boardInput).toHaveAttribute('maxlength', '32');
  const card0 = page.locator('.board-card').nth(0);
  await clickCard(page, 0);
  await boardInput.fill('np1-6-0007');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.control-status')).toHaveText('Invalid board code.');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Invalid board code.');
  await expect(boardInput).toHaveValue('np1-6-0007');
  await expect(card0).toHaveAttribute('data-state', 'revealed');
  await expect(size).toHaveValue('4');

  await boardInput.fill(' np1-6-7 ');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(size).toHaveValue('6');
  await expect(boardInput).toHaveValue('np1-6-7');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(page.locator('.board-card').first()).toHaveAttribute('data-state', 'closed');
});

test('snapshot export is readable and preserves a pending mismatch', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, CODE);
  await clickCard(page, 0);
  await clickCard(page, 1);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const textarea = page.getByLabel('Snapshot JSON', { exact: true });
  const text = await textarea.inputValue();
  const snapshot: unknown = JSON.parse(text);
  expect(text).toContain('\n');
  await expect(textarea).toHaveAttribute('maxlength', '65536');
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  expect(snapshot).toMatchObject({
    version: 1,
    boardCode: CODE,
    selection: { kind: 'mismatch' },
    moves: 1,
    started: true
  });
  await textarea.fill('{broken');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.control-status')).toHaveText('Invalid snapshot.');
  await expect(textarea).toHaveValue('{broken');
  await expect(page.locator('.board-card').nth(0)).toHaveAttribute('data-state', 'revealed');
});

test('an imported unfinished snapshot blocks activation and Resume restores board focus', async ({ page }) => {
  await page.goto('/');
  const base = pairsForCode(CODE);
  const completedPair = base[0];
  if (completedPair === undefined) throw new Error('Test board has no pair');
  const firstMismatch = base[1];
  const secondMismatch = base[2];
  if (firstMismatch === undefined || secondMismatch === undefined) throw new Error('Test board has no mismatch');
  const matched = [completedPair.positions[0], completedPair.positions[1]];
  const mismatch = JSON.stringify({
    version: 1, boardCode: CODE, matched,
    selection: {
      kind: 'mismatch', first: firstMismatch.positions[0], second: secondMismatch.positions[0], remainingMs: 300
    },
    moves: 2, elapsedMs: 500, started: true
  });
  await loadSnapshot(page, mismatch);
  await expect(page.locator('.control-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('.score-strip')).toContainText('Pairs: 1/8');

  await page.locator('.board-card').nth(8).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.board-card').nth(8)).toHaveAttribute('data-state', 'closed');
  await expect(page.locator('.score-strip')).toContainText('Moves: 2');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.board-card').nth(8)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  expect(await page.locator('.control-status').textContent()).toBe(' ');
});

test('a completed import is static, has no Resume control, and does not set a best', async ({ page }) => {
  await page.goto('/');
  const text = makeSnapshot(CODE, pairsForCode(CODE).flatMap((pair) => pair.positions), 8, 4567);
  await loadSnapshot(page, text);
  await expect(page.locator('.control-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/is-new-win/);
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(page.locator('.score-strip')).toContainText('Best: none');
});

test('snapshot length input and board drafts have specified limits', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, CODE);
  const board = page.getByLabel('Board code', { exact: true });
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  await expect(board).toHaveAttribute('maxlength', '32');
  await expect(snapshot).toHaveAttribute('maxlength', '65536');
  expect(await board.evaluate((element) => element instanceof HTMLInputElement ? element.maxLength : -1)).toBe(32);
  expect(await snapshot.evaluate((element) => element instanceof HTMLTextAreaElement ? element.maxLength : -1)).toBe(65_536);
});

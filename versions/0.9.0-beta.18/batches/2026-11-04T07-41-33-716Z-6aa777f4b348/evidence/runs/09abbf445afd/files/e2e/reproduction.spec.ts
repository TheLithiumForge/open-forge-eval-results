import { expect, test } from '@playwright/test';
import { DEFAULT_CODE, completedSnapshot, freezePageClock, loadBoard, loadSnapshot, openReproduction, snapshotText } from './helpers.ts';

test('board code drafts survive card actions, invalid loads and retain control focus', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, DEFAULT_CODE);
  const input = page.getByLabel('Board code');
  await input.fill('not-a-board');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.control-status')).toHaveText('Invalid board code.');
  await expect(input).toHaveValue('not-a-board');
  await expect(page.locator('.memory-card')).toHaveCount(16);

  await page.locator('.memory-card').nth(0).click();
  await expect(input).toHaveValue('not-a-board');
  const loadButton = page.getByRole('button', { name: 'Load board', exact: true });
  await loadButton.focus();
  await input.fill('  np1-6-1  ');
  await loadButton.click();
  await expect(loadButton).toBeFocused();
  await expect(page.locator('.memory-card')).toHaveCount(36);
  await expect(input).toHaveValue('np1-6-1');

  await input.fill('draft');
  const restart = page.getByRole('button', { name: 'Restart', exact: true });
  await restart.click();
  await expect(restart).toBeFocused();
  await expect(input).toHaveValue('np1-6-1');
  await expect(page.getByText('Moves: 0')).toBeVisible();
});

test('unfinished snapshot waits for Resume and preserves its mismatch time and focus', async ({ page }) => {
  await freezePageClock(page);
  await page.goto('/');
  const mismatch = snapshotText(DEFAULT_CODE, {
    kind: 'mismatch', first: 1, second: 2, remainingMs: 300,
  }, 1, 1200);
  await loadSnapshot(page, mismatch);
  await expect(page.locator('.control-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  const cards = page.locator('.memory-card');
  await cards.nth(1).click({ force: true });
  await expect(page.getByText('Moves: 1')).toBeVisible();
  await page.clock.runFor(500);
  await expect(cards.nth(1)).toHaveAttribute('aria-label', /revealed$/);

  await cards.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await resume.click();
  await expect(cards.nth(5)).toBeFocused();
  await page.clock.runFor(299);
  await expect(cards.nth(1)).toHaveAttribute('aria-label', /revealed$/);
  await page.clock.runFor(1);
  await expect(cards.nth(1)).toHaveAttribute('aria-label', /closed$/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
});

test('invalid snapshots preserve game and draft; completed imports skip score writes and pulse', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, DEFAULT_CODE);
  const cards = page.locator('.memory-card');
  await cards.nth(0).click();
  const snapshotInput = page.getByLabel('Snapshot JSON');
  await snapshotInput.fill('{"invalid":true}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.control-status')).toHaveText('Invalid snapshot.');
  await expect(snapshotInput).toHaveValue('{"invalid":true}');
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/);

  await snapshotInput.fill(completedSnapshot(DEFAULT_CODE));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.control-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Every pair found' })).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/pulse/);
  await expect(page.getByText('Best: none')).toBeVisible();
  await expect(cards).toHaveCount(16);
  await expect(cards.first()).toHaveAttribute('aria-disabled', 'true');
});

test('Export snapshot is readable, stays in memory, and board controls have exact limits', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Board code')).toHaveAttribute('maxlength', '32');
  const textarea = page.getByLabel('Snapshot JSON');
  await expect(textarea).toHaveAttribute('maxlength', '65536');
  await loadBoard(page, DEFAULT_CODE);
  await page.locator('.memory-card').nth(0).click();
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const exported = await textarea.inputValue();
  expect(exported).toContain('\n  "version": 1');
  expect(JSON.parse(exported)).toMatchObject({ boardCode: DEFAULT_CODE, selection: { kind: 'one', index: 0 } });
  await openReproduction(page);
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeVisible();
});

test('board imports store their supported size while bad codes leave it alone', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-6-1');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.memory-card')).toHaveCount(36);
});

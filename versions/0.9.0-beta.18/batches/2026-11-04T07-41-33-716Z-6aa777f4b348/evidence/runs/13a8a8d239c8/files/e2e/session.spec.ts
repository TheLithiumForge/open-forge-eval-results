import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { isRecord, loadBoard, openReproduction, parseJson } from './helpers.ts';

const mismatchSnapshot = JSON.stringify({
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1_500, started: true,
});

async function exportedSnapshot(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const value = parseJson(await page.getByLabel('Snapshot JSON').inputValue());
  if (!isRecord(value)) throw new Error('The exported snapshot should be an object.');
  return value;
}

async function setDocumentHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('pauses visibility clock and mismatch, then closes after remaining active time', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await page.getByRole('button', { name: 'Row 1, column 2, closed' }).click();
  await page.clock.runFor(300);
  await setDocumentHidden(page, true);
  await page.clock.runFor(2_000);
  let exported = await exportedSnapshot(page);
  expect(exported.elapsedMs).toBe(300);
  expect(isRecord(exported.selection) ? exported.selection.remainingMs : null).toBe(500);

  await setDocumentHidden(page, false);
  await page.clock.runFor(499);
  exported = await exportedSnapshot(page);
  expect(isRecord(exported.selection) ? exported.selection.remainingMs : null).toBe(1);
  await page.clock.runFor(1);
  await expect(page.getByRole('button', { name: 'Row 1, column 1, closed' })).toBeVisible();
});

test('keeps unfinished snapshot paused, blocks input, and resumes remembered focus with remaining time', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON').fill(mismatchSnapshot);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Row 3, column 3, closed' }).click();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Row 3, column 2, closed' })).toBeFocused();
  await page.clock.runFor(1_000);
  const pausedExport = await exportedSnapshot(page);
  expect(isRecord(pausedExport.selection) ? pausedExport.selection.remainingMs : null).toBe(300);

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Row 3, column 2, closed' })).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.getByRole('button', { name: 'Row 1, column 2, cyan solid chevron, marker top, revealed' })).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.getByRole('button', { name: 'Row 1, column 2, closed' })).toBeVisible();
});

test('new, restart, size and loaded deals reject mismatch timers from earlier revisions', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  const beginMismatch = async () => {
    await loadBoard(page, 'np1-4-1');
    await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
    await page.getByRole('button', { name: 'Row 1, column 2, closed' }).click();
  };
  const newGameRevealSurvives = async () => {
    await page.getByRole('button', { name: 'Row 1, column 3, closed' }).click();
    await page.clock.runFor(900);
    await expect(page.getByRole('button', { name: /Row 1, column 3, .*revealed/ })).toBeVisible();
    await expect(page.locator('.game-summary')).toContainText('Moves: 0');
  };

  await page.goto('/');
  await beginMismatch();
  await page.getByRole('button', { name: 'Restart' }).click();
  await newGameRevealSurvives();

  await beginMismatch();
  await page.getByRole('button', { name: 'New Game' }).click();
  await newGameRevealSurvives();

  await beginMismatch();
  await page.getByLabel('Grid size').selectOption('6');
  await newGameRevealSurvives();

  await beginMismatch();
  await openReproduction(page);
  await page.getByLabel('Board code').fill('np1-6-2');
  await page.getByRole('button', { name: 'Load board' }).click();
  await newGameRevealSurvives();
});

test('imports a completed snapshot without celebration or changing the best score', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.addInitScript(() => localStorage.setItem('neon-pairs.best.v1', '{"4":10}'));
  await page.goto('/');
  await openReproduction(page);
  const matched = Array.from({ length: 16 }, (_value, index) => index);
  const snapshot = JSON.stringify({
    version: 1, boardCode: 'np1-4-1', matched, selection: { kind: 'closed' },
    moves: 8, elapsedMs: 2_000, started: true,
  });
  await page.getByLabel('Snapshot JSON').fill(snapshot);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByText('All pairs found in 8 moves and 0:02.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(page.locator('.win-banner')).not.toHaveClass(/pulse/);
  await expect(page.locator('.game-summary')).toContainText('Best: 10');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.best.v1'))).toBe('{"4":10}');
});

test('records and celebrates a win after resuming an unfinished imported game', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await openReproduction(page);
  const progress = JSON.stringify({
    version: 1, boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_value, index) => index).filter((index) => index !== 0 && index !== 11),
    selection: { kind: 'one', index: 0 }, moves: 7, elapsedMs: 2_500, started: true,
  });
  await page.getByLabel('Snapshot JSON').fill(progress);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('.game-summary')).toContainText('Best: none');

  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Row 3, column 4, closed' }).click();
  await expect(page.locator('.game-summary')).toContainText('Moves: 8');
  await expect(page.locator('.game-summary')).toContainText('Best: 8');
  await expect(page.locator('.win-banner')).toHaveClass(/pulse/);
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Pair found. All pairs found in 8 moves and 0:02.');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.best.v1'))).toBe('{"4":8}');
});

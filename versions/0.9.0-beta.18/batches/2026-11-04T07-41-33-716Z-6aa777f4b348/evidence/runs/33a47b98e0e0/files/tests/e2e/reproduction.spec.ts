import { expect, test } from '@playwright/test';
import { boardFor, cardAt, finishByPointer, loadBoard, pairPositions, snapshotFor, openReproduction } from './helpers.ts';

test('valid board codes replace the deal; invalid drafts survive card actions and leave size saved', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Grid size').selectOption('6');
  await loadBoard(page, ' np1-6-17 ');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByLabel('Board code')).toHaveValue('np1-6-17');
  await expect(page.locator('.screen-reader-output')).toContainText('Loaded board.');
  await page.getByLabel('Board code').fill('np1-5-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Board code')).toHaveValue('np1-5-1');
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await cardAt(page, 0).click();
  await expect(cardAt(page, 0)).toHaveAttribute('aria-label', /revealed$/);
  await expect(page.getByLabel('Board code')).toHaveValue('np1-5-1');

  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByLabel('Board code')).not.toHaveValue('np1-5-1');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.status-readout')).toContainText('Moves: 0');
});

test('exports readable active progress and rejects a bad snapshot without replacing the game', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await cardAt(page, 0).click();
  await page.waitForTimeout(1_100);
  await openReproduction(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const exported = await page.getByLabel('Snapshot JSON').inputValue();
  expect(exported).toContain('\n  "version": 1');
  const elapsed = /"elapsedMs": (\d+)/.exec(exported)?.[1];
  expect(elapsed).toBeDefined();
  expect(Number(elapsed)).toBeGreaterThanOrEqual(1_000);
  expect(Number.isInteger(Number(elapsed))).toBe(true);
  expect(await cardAt(page, 0).getAttribute('aria-label')).toContain('revealed');

  await page.getByLabel('Snapshot JSON').fill('{');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{');
  await expect(page.getByLabel('Board code')).toHaveValue('np1-4-1');
  await expect(page.locator('.status-readout')).toContainText('Pairs: 0/8');
});

test('pauses an imported mismatch, preserves its time, and resumes with remembered focus', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON').fill(snapshotFor('np1-4-1', 0, {
    kind: 'mismatch', first: 0, second: 1, remainingMs: 300,
  }, 1_500));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.locator('.screen-reader-output')).toContainText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(cardAt(page, 0)).toHaveAttribute('aria-disabled', 'true');
  await cardAt(page, 0).click({ force: true });
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"remainingMs": 300/);
  await cardAt(page, 0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cardAt(page, 4)).toBeFocused();
  await page.waitForTimeout(450);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"remainingMs": 300/);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cardAt(page, 4)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.waitForTimeout(240);
  await expect(cardAt(page, 0)).toHaveAttribute('aria-label', /revealed$/);
  await page.waitForTimeout(140);
  await expect(cardAt(page, 0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed');
});

test('completed imports show a static win and preserve an existing better best score', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neon-pairs:best-scores:v1', JSON.stringify({ version: 1, scores: { 16: 140 } })));
  await page.goto('/');
  await loadBoard(page, 'np1-16-1');
  const game = boardFor('np1-16-1');
  const matched = pairPositions(game).flat();
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify({
    version: 1, boardCode: 'np1-16-1', matched, selection: { kind: 'closed' },
    moves: 128, elapsedMs: 5_000, started: true,
  }));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Game complete' })).not.toHaveClass(/is-celebrating/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.status-readout')).toContainText('Best: 140');
  await page.reload();
  await expect(page.locator('.status-readout')).toContainText('Best: 140');
});

test('stores only a better played score for its board size', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(() => localStorage.setItem('neon-pairs:best-scores:v1', JSON.stringify({
    version: 1, scores: { 4: 10, 6: 3 },
  })));
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await expect(page.locator('.status-readout')).toContainText('Best: 10');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
  await finishByPointer(page, 'np1-4-1');
  await expect(page.locator('.status-readout')).toContainText('Best: 8');
  await page.clock.runFor(600);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await finishByPointer(page, 'np1-4-1');
  await expect(page.locator('.status-readout')).toContainText('Best: 8');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await finishByPointer(page, 'np1-4-1', () => page.clock.runFor(800));
  await expect(page.locator('.status-readout')).toContainText('Moves: 9');
  await expect(page.locator('.status-readout')).toContainText('Best: 8');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.locator('.status-readout')).toContainText('Best: 3');
});

test('ignores corrupt saved records and keeps play available when storage throws', async ({ browser, page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('neon-pairs:preferences:v1', '{');
    localStorage.setItem('neon-pairs:best-scores:v1', '{');
    localStorage.setItem('unrelated-game-data', 'keep me');
  });
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.locator('.status-readout')).toContainText('Best: none');
  await loadBoard(page, 'np1-6-1');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-game-data'))).toBe('keep me');

  const context = await browser.newContext();
  try {
    await context.addInitScript(() => Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => { throw new DOMException('Storage disabled', 'SecurityError'); },
    }));
    const unavailable = await context.newPage();
    await unavailable.goto('/');
    await expect(unavailable.getByLabel('Grid size')).toHaveValue('4');
    await unavailable.locator('.game-card').nth(0).click();
    await unavailable.locator('.game-card').nth(1).click();
    await expect(unavailable.locator('.status-readout')).toContainText('Moves: 1');
    await openReproduction(unavailable);
    await unavailable.getByRole('button', { name: 'Export snapshot', exact: true }).click();
    await expect(unavailable.getByLabel('Snapshot JSON')).toHaveValue(/"boardCode"/);
  } finally {
    await context.close();
  }
});

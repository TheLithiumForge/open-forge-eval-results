import { expect, test } from '@playwright/test';
import { decodeSnapshot } from '../src/game/snapshot.ts';
import { card, completedSnapshot, gameFor, loadBoard, loadSnapshot, pairsFor, pauseClock, snapshotFor } from './helpers.ts';

test('unfinished snapshots pause play, preserve active remainder and resume focus', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  const state = gameFor('np1-4-1');
  await loadSnapshot(page, snapshotFor('np1-4-1', [0, 11],
    { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, 2, 1000));
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(1);
  await card(page, 1).focus();
  await page.keyboard.press('ArrowDown');
  await expect(card(page, 5)).toBeFocused();
  await card(page, 3).click();
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(700);
  await expect(card(page, 1)).toHaveAccessibleName(/revealed/);
  await card(page, 5).focus();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(card(page, 5)).toBeFocused();
  await page.clock.runFor(299);
  await expect(card(page, 1)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(card(page, 1)).toHaveAccessibleName('Row 1, column 2, closed');
  expect(state.board.boardCode).toBe('np1-4-1');
});

test('a one millisecond imported mismatch stays paused until Resume', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadSnapshot(page, snapshotFor('np1-4-1', [],
    { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 }, 1, 20));
  await page.clock.runFor(5000);
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1);
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, closed');
});

test('completed snapshot imports stay static and do not replace saved best moves', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neon-pairs.preferences.v1',
    JSON.stringify({ version: 1, size: 4, bests: { 4: 12 } })));
  await page.goto('/');
  await expect(page.getByText('Best: 12', { exact: true })).toBeVisible();
  await loadSnapshot(page, completedSnapshot('np1-4-1', 8));
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: 12', { exact: true })).toBeVisible();
  await expect(page.locator('.completion-banner')).not.toHaveClass(/completion-banner--pulse/);
  await expect(page.locator('.completion-banner')).toContainText('Finished in 8 moves');
});

test('finishing an unfinished import records the size best and export round-trips progress', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neon-pairs.preferences.v1',
    JSON.stringify({ version: 1, size: 4, bests: { 4: 12 } })));
  await page.goto('/');
  const code = 'np1-4-1';
  const game = gameFor(code);
  const pairs = pairsFor(code);
  const untouchedPair = pairs.get(game.board.deck[0] ?? -1);
  expect(untouchedPair).toBeDefined();
  if (untouchedPair === undefined) return;
  const [first, second] = untouchedPair;
  const matched = game.board.deck.flatMap((_, index) => index === first || index === second ? [] : [index]);
  await loadSnapshot(page, snapshotFor(code, matched, { kind: 'one', index: first }, 7, 2500));
  await page.getByRole('button', { name: 'Resume' }).click();
  await card(page, second).click();
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  expect(saved).toContain('"4":8');
  await loadBoard(page, code);
  await card(page, 0).click();
  await openBoardCode(page);
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  await expect(snapshot).toHaveValue(/"version": 1/);
  await expect(snapshot).toHaveValue(/"started": true/);
  const exported = await snapshot.inputValue();
  expect(decodeSnapshot(exported)?.started).toBe(true);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
});

async function openBoardCode(page: import('@playwright/test').Page): Promise<void> {
  const input = page.getByLabel('Board code', { exact: true });
  if (!(await input.isVisible())) await page.getByText('Reproduce a game', { exact: true }).click();
}

import { expect, test } from '@playwright/test';
import { cards, completedSnapshot, finish, freezeClock, loadBoard, loadSnapshot } from './helpers.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('board drafts persist through actions, invalid loads retain game, and controls keep focus', async ({ page }) => {
  await loadBoard(page, ' np1-6-42 ');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  const code = page.getByLabel('Board code', { exact: true });
  await expect(code).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
  await code.fill('np1-4-01');
  await cards(page).first().click();
  await expect(code).toHaveValue('np1-4-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(cards(page)).toHaveCount(36);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(code).toHaveValue('np1-4-01');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(code).toHaveValue('np1-6-42');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill('{}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue('{}');
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
});

test('imports paused mismatch, exports exact progress, navigates while paused and resumes at remembered focus', async ({ page }) => {
  await freezeClock(page);
  const snapshot = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true };
  await loadSnapshot(page, JSON.stringify(snapshot));
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await page.clock.runFor(2000);
  await cards(page).nth(3).click({ force: true });
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  expect(JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue())).toEqual(snapshot);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(4);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
});

test('completed imports stay static and never update best; unfinished imports can earn a best', async ({ page }) => {
  await loadSnapshot(page, completedSnapshot());
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await loadSnapshot(page, JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [],
    selection: { kind: 'one', index: 0 }, moves: 0, elapsedMs: 3000, started: true }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(11).click();
  await finish(page, 'np1-4-1', [0, 11]);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { cards, finish, freezeClock, loadBoard, loadSnapshot } from './journey.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('paused mismatch import, focus movement, Resume, and exact remaining time', async ({ page }) => {
  await freezeClock(page);
  await loadSnapshot(page, { matched: [0, 11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true });
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(page.locator('[aria-live]')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(cards(page).locator('svg')).toHaveCount(4);
  await cards(page).nth(3).click();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.clock.runFor(5000);
  await expect(page.getByText('Time: 0:01', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(cards(page).locator('svg')).toHaveCount(4);
  await page.clock.runFor(1);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  await expect(cards(page).locator('svg')).toHaveCount(2);
  const snapshot: unknown = JSON.parse(await page.getByLabel('Snapshot JSON').inputValue());
  expect(snapshot).toMatchObject({ moves: 2, elapsedMs: 1800, selection: { kind: 'closed' } });
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
});

test('completed imports are static, do not write best, and unfinished imports can earn best', async ({ page }) => {
  await loadSnapshot(page, { matched: Array.from({ length: 16 }, (_, i) => i),
    moves: 8, elapsedMs: 60000, started: true });
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  expect(await page.locator('.win-banner').evaluate(element => element.getAnimations().length)).toBe(0);
  await loadSnapshot(page, { matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 12 && i !== 13),
    moves: 9, elapsedMs: 2000, started: true });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
  await loadSnapshot(page, { matched: Array.from({ length: 16 }, (_, i) => i), moves: 8, started: true });
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible();
  await loadBoard(page);
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

test('invalid loads preserve state, drafts, focus and size; export is readable', async ({ page }) => {
  await loadBoard(page);
  await cards(page).nth(0).click();
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-01');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(cards(page).locator('svg')).toHaveCount(1);
  await page.getByLabel('Snapshot JSON').fill('{"version":2}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{"version":2}');
  await expect(cards(page).locator('svg')).toHaveCount(1);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const exported = await page.getByLabel('Snapshot JSON').inputValue();
  expect(exported).toContain('\n  "version": 1,');
  expect(JSON.parse(exported)).toMatchObject({ selection: { kind: 'one', index: 0 }, moves: 0 });
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('time and move caps remain playable in the browser', async ({ page }) => {
  await loadSnapshot(page, { moves: 999999, elapsedMs: 359999999, started: true });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await finish(page);
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
});

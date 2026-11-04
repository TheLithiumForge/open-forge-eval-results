import { expect, test } from '@playwright/test';
import { cards, exported, frozenClock, game, loadBoard, loadState, tools } from './helpers.ts';

test('drafts, exact load errors and atomic replacement', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await loadBoard(page);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON')).toHaveAttribute('maxlength', '65536');
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-01');
  await cards(page).nth(0).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-01');
  const saved = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.getByLabel('Snapshot JSON').fill('{"version":2}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{"version":2}');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(saved);
  await page.getByLabel('Board code', { exact: true }).fill('  np1-6-1  ');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-1');
  await expect(cards(page)).toHaveCount(36);
  await expect(page.locator('.card-revealed')).toHaveCount(0);
});

test('unfinished mismatch import pauses, Resume focuses remembered card and finishes remaining time', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadState(page, { ...game(), matched: [0, 11], moves: 2, elapsedMs: 1500, started: true,
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 } });
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await cards(page).nth(4).click({ force: true });
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.clock.runFor(5000);
  expect((await exported(page)).elapsedMs).toBe(1500);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(page.locator('.card-revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card-revealed')).toHaveCount(0);
  const result = await exported(page);
  expect(result.elapsedMs).toBe(1800);
  expect(result.moves).toBe(2);
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
});

test('completed imports are static, do not save best, and caps still allow completion', async ({ page }) => {
  await page.goto('/');
  const initial = game();
  await loadState(page, { ...initial, matched: initial.deck.map((_, index) => index), moves: 8,
    elapsedMs: 3600000, started: true });
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Time: 60:00', { exact: true })).toBeVisible();
  await tools(page);
  await loadState(page, { ...initial, matched: initial.deck.flatMap((face, i) => face === 6 ? [] : [i]),
    moves: 999999, elapsedMs: 359999999, started: true });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
});

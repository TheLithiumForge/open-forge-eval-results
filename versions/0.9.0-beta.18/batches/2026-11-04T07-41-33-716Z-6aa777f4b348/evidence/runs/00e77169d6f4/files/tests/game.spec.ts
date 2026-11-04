import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { SIZES } from '../src/game/boardCode.ts';
import { cards, completed, frozenClock, loadBoard, loadSnapshot, tools, win } from './helpers.ts';

for (const size of SIZES) test(`finishes ${size}x${size} with whole pairs`, async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await loadBoard(page, size);
  await win(page, size, size >= 8);
  await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Best: ${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(cards(page).first()).toHaveAttribute('aria-disabled', 'true');
});
test('turns, ignored input, exact active mismatch interval and timer invalidation', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/'); await loadBoard(page);
  await cards(page).nth(0).click(); await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await cards(page).nth(1).click(); await cards(page).nth(2).click(); await cards(page).nth(3).click();
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
  await cards(page).nth(1).click(); await cards(page).nth(2).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(2).click(); await page.clock.runFor(1000);
  await expect(cards(page).nth(2)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await cards(page).nth(0).click(); await page.clock.runFor(1000);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
});
test('hidden page pauses both clocks and resumes the remaining mismatch', async ({ page }) => {
  await frozenClock(page); await page.goto('/'); await loadBoard(page);
  await cards(page).nth(0).click(); await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
});
test('saved size and better, equal, worse best scores survive reload', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  await cards(page).nth(0).click(); await cards(page).nth(1).click();
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
  await win(page);
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await win(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await win(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(0).click(); await cards(page).nth(1).click();
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/); await win(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size').selectOption('6'); await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});
test('snapshot pause, remaining time, resume focus, and completed import', async ({ page }) => {
  await frozenClock(page); await page.goto('/');
  const text = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true });
  await loadSnapshot(page, text);
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await cards(page).nth(6).click(); await page.clock.runFor(5000);
  await expect(page.getByText('Time: 0:01', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"remainingMs": 300/);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(6)).toBeFocused();
  await page.clock.runFor(299); await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1); await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
  await loadSnapshot(page, completed());
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
});
test('unfinished imported game earns a best when completed in play', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  await cards(page).nth(0).click(); await cards(page).nth(11).click();
  await tools(page); await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const text = await page.getByLabel('Snapshot JSON').inputValue();
  await loadSnapshot(page, text); await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await win(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});
test('offline file distribution plays with all network requests blocked', async ({ page, context }) => {
  const requests: string[] = [];
  await context.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page); await win(page);
  await expect(page.locator('script[src], link[rel="stylesheet"], audio, canvas')).toHaveCount(0);
  expect(requests).toEqual([]);
});
test('move and elapsed caps keep pairs playable and display unbounded minutes', async ({ page }) => {
  await frozenClock(page); await page.goto('/');
  await loadSnapshot(page, JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [],
    selection: { kind: 'one', index: 0 }, moves: 999999, elapsedMs: 359999900, started: true }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1000); await cards(page).nth(11).click();
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
});

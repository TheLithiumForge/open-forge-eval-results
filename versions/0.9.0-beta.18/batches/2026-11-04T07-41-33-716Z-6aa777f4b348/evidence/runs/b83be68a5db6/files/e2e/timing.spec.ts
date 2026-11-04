import { expect, test } from '@playwright/test';
import { exported, loadBoard, loadSnapshot } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-11-04T00:01:00Z'));
  await loadBoard(page);
});

test('mismatch and elapsed use the same active time across hidden pages', async ({ page }) => {
  await page.clock.runFor(3000);
  expect((await exported(page)).elapsedMs).toBe(0);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  const paused = await exported(page);
  expect(paused.elapsedMs).toBe(500);
  expect(paused.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 300 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(299);
  await page.locator('.card').nth(2).click();
  expect((await exported(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  await page.locator('.card').nth(2).click();
  expect((await exported(page)).selection).toEqual({ kind: 'one', index: 2 });
  await expect(page.locator('.status')).toContainText('Moves: 1');
});

test('unfinished import blocks activation and timers until Resume and restores focus', async ({ page }) => {
  await loadSnapshot(page, { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true });
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('.card').nth(3).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.card').nth(7)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.clock.runFor(5000);
  const waiting = await exported(page);
  expect(waiting.elapsedMs).toBe(1500);
  expect(waiting.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 300 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(7)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  expect((await exported(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  expect((await exported(page)).elapsedMs).toBe(1800);
});

test('replacing a pending turn invalidates old timer callbacks', async ({ page }) => {
  for (const action of ['Restart', 'New Game', 'Load board']) {
    await loadBoard(page);
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(1).click();
    await page.clock.runFor(300);
    await page.getByRole('button', { name: action, exact: true }).click();
    await page.locator('.card').nth(2).click();
    await page.clock.runFor(1000);
    expect((await exported(page)).selection).toEqual({ kind: 'one', index: 2 });
    await expect(page.locator('.status')).toContainText('Moves: 0');
  }
  await page.getByLabel('Grid size').selectOption('6');
  await page.clock.runFor(1000);
  await expect(page.locator('.card')).toHaveCount(36);
  expect((await exported(page)).selection.kind).toBe('closed');
});

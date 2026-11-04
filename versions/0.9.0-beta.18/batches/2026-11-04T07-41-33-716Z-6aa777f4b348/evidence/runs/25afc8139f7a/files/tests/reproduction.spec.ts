import { expect, test } from '@playwright/test';
import { encodeSnapshot } from '../src/game/snapshot.ts';
import { card, completedSnapshot, exported, frozenClock, game, importSnapshot, openBoard, preferencesKey } from './helpers.ts';

test('drafts survive play; invalid loads preserve progress, size, draft and button focus', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  const code = page.getByLabel('Board code', { exact: true });
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  await code.fill('np1-6-0');
  await card(page, 0).click();
  await expect(code).toHaveValue('np1-6-0');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid board code.');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(code).toHaveValue('np1-6-0');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  const before = await exported(page);
  await snapshot.fill('{broken');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  await expect(snapshot).toHaveValue('{broken');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  expect(await exported(page)).toEqual(before);
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await code.fill('  np1-6-1  ');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(code).toHaveValue('np1-6-1');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(page.locator('.card[tabindex="0"]')).toHaveAccessibleName('Row 1, column 1, closed');
});

test('snapshot mismatch pauses input and time, Resume restores remembered focus and exact remaining time', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  const text = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true });
  await importSnapshot(page, text);
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await card(page, 0).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(card(page, 5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.clock.runFor(5000);
  const paused = await exported(page);
  expect(paused.elapsedMs).toBe(1500);
  expect(paused.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 300 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(card(page, 5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  expect((await exported(page)).selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  expect((await exported(page)).elapsedMs).toBe(1800);
});

test('completed import is static and preserves best; finishing an unfinished import records a best', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ size: 4, bests: { 4: 12 } })), preferencesKey);
  await frozenClock(page);
  await openBoard(page);
  await importSnapshot(page, completedSnapshot());
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.game-status')).toContainText('Best: 12');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  const state = game();
  await importSnapshot(page, encodeSnapshot({ ...state, started: true, moves: 9, elapsedMs: 1000,
    matched: state.board.deck.map((_, index) => index).filter((index) => index !== 12 && index !== 13) }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await card(page, 12).click();
  await card(page, 13).click();
  await expect(page.locator('.game-status')).toContainText('Best: 10');
});

test('move and clock caps keep imported play completable', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  const state = game();
  await importSnapshot(page, encodeSnapshot({ ...state, started: true, moves: 999999, elapsedMs: 359999990,
    matched: state.board.deck.map((_, index) => index).filter((index) => index !== 12 && index !== 13) }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(2000);
  await card(page, 12).click();
  await card(page, 13).click();
  const finished = await exported(page);
  expect(finished.moves).toBe(999999);
  expect(finished.elapsedMs).toBe(359999999);
  await expect(page.locator('.win-banner')).toContainText('999999 moves and 5999:59');
});

import { expect, test } from '@playwright/test';
import { GRID_SIZES } from '../src/game/deck.ts';
import { activate, exported, freezeTime, loadBoard, solve } from './helpers.ts';

for (const size of GRID_SIZES) {
  test(`finishes all ${size}x${size} pairs through native card actions`, async ({ page }) => {
    await page.goto('/');
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await solve(page, code);
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.locator('.card[aria-disabled="true"]')).toHaveCount(size * size);
    const before = await exported(page);
    await page.waitForTimeout(150);
    expect((await exported(page)).elapsedMs).toBe(before.elapsedMs);
  });
}

test('counts valid turns and closes misses after exactly 800 active milliseconds', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await freezeTime(page);
  await activate(page, 0);
  await activate(page, 0);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await activate(page, 11);
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await activate(page, 0);
  await activate(page, 1);
  await activate(page, 2);
  await activate(page, 3);
  expect((await exported(page)).moves).toBe(2);
  await page.clock.runFor(799);
  expect((await exported(page)).selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  await activate(page, 3);
  expect((await exported(page)).selection).toEqual({ kind: 'one', index: 3 });
});

test('pauses both clocks during hidden-page time and resumes the remaining miss', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await freezeTime(page);
  await activate(page, 0);
  await activate(page, 1);
  await page.clock.runFor(200);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  const hidden = await exported(page);
  expect(hidden.elapsedMs).toBe(200);
  expect(hidden.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 600 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(599);
  expect((await exported(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  expect((await exported(page)).elapsedMs).toBe(800);
});

for (const action of ['Restart', 'New Game', 'Load board']) {
  test(`${action} invalidates a previous mismatch timer`, async ({ page }) => {
    await page.goto('/');
    await loadBoard(page);
    await freezeTime(page);
    await activate(page, 0);
    await activate(page, 1);
    await page.getByRole('button', { name: action, exact: true }).dispatchEvent('click');
    await activate(page, 2);
    await page.clock.runFor(1000);
    const state = await exported(page);
    expect(state.moves).toBe(0);
    expect(state.matched).toEqual([]);
    expect(state.selection).toEqual({ kind: 'one', index: 2 });
    if (action === 'Restart') expect(state.board.code).toBe('np1-4-1');
    if (action === 'New Game') expect(state.board.code).not.toBe('np1-4-1');
  });
}

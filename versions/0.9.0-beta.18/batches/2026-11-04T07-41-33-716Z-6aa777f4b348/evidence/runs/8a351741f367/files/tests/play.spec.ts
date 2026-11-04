import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/boardCode.ts';
import { card, exported, finish, frozenClock, loadBoard } from './gameActions.ts';

for (const size of SIZES) {
  test(`finishes every pair of a ${size}x${size} board`, async ({ page }) => {
    test.setTimeout(180_000);
    await frozenClock(page);
    await page.goto('/');
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue(String(size));
    await expect(page.locator('.card')).toHaveCount(size * size);
    await finish(page, code);
    await expect(page.locator('.game-status')).toContainText(`Moves: ${size * size / 2}`);
    await expect(page.locator('.game-status')).toContainText(`Pairs: ${size * size / 2}/${size * size / 2}`);
    await expect(page.locator('.game-status')).toContainText(`Best: ${size * size / 2}`);
    await expect(page.locator('.card[aria-disabled="true"]')).toHaveCount(size * size);
    const snapshot = await exported(page);
    await page.clock.runFor(1000);
    expect((await exported(page)).elapsedMs).toBe(snapshot.elapsedMs);
  });
}

test('counts only second valid reveals and resolves misses after 800 active ms', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadBoard(page);
  await page.clock.runFor(5000);
  expect((await exported(page)).elapsedMs).toBe(0);
  await card(page, 0).click();
  await card(page, 0).click();
  expect((await exported(page)).moves).toBe(0);
  await card(page, 11).click();
  await card(page, 0).press('Enter');
  expect((await exported(page)).moves).toBe(1);
  await card(page, 1).click();
  await card(page, 2).click();
  await card(page, 3).click();
  let game = await exported(page);
  expect(game.moves).toBe(2);
  expect(game.selection.kind).toBe('mismatch');
  await page.clock.runFor(799);
  game = await exported(page);
  expect(game.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  await card(page, 2).click();
  await card(page, 6).click();
  game = await exported(page);
  expect(game.moves).toBe(3);
  expect(game.matched).toEqual([0, 11, 2, 6]);
  expect(game.elapsedMs).toBe(800);
});

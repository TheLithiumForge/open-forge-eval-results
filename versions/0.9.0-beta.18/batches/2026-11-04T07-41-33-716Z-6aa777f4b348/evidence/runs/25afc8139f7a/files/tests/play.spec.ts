import { expect, test } from '@playwright/test';
import { BOARD_SIZES } from '../src/game/boardCode.ts';
import { card, complete, exported, frozenClock, game, literalPairs, openBoard } from './helpers.ts';

for (const size of BOARD_SIZES) {
  test(`complete every pair on ${size}x${size}`, async ({ page }) => {
    test.setTimeout(120000);
    const code = `np1-${size}-1`;
    await openBoard(page, code);
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue(String(size));
    await expect(page.locator('.card')).toHaveCount(size * size);
    await complete(page, game(code), size > 4);
    await expect(page.locator('.game-status')).toContainText(`Moves: ${size * size / 2}`);
    await expect(page.locator('.game-status')).toContainText(`Pairs: ${size * size / 2}/${size * size / 2}`);
    await expect(page.locator('.card-matched')).toHaveCount(size * size);
    const finished = await exported(page);
    await page.waitForTimeout(30);
    expect((await exported(page)).elapsedMs).toBe(finished.elapsedMs);
  });
}

test('literal deal: repeat reveal, match immediately, then miss once', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  await card(page, 0).click();
  await card(page, 0).click();
  expect((await exported(page)).moves).toBe(0);
  await card(page, 11).click();
  await expect(card(page, 0)).toHaveAttribute('aria-disabled', 'true');
  expect((await exported(page)).matched).toEqual([0, 11]);
  await card(page, 0).click({ force: true });
  await card(page, 1).click();
  await card(page, 2).click();
  const missed = await exported(page);
  expect(missed.moves).toBe(2);
  expect(missed.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 800 });
  await card(page, 3).click({ force: true });
  expect((await exported(page)).selection).toEqual(missed.selection);
});

test('completion pulse ends once, remains static and records the local best', async ({ page }) => {
  await openBoard(page);
  for (const [first, second] of literalPairs) {
    await card(page, first).click();
    await card(page, second).click();
  }
  const banner = page.locator('.win-banner');
  await expect(banner).toContainText(/Completed in 8 moves and \d+:\d{2}\./);
  expect(await banner.evaluate((element) => getComputedStyle(element).animationDuration)).toBe('0.6s');
  expect(await banner.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe('1');
  await expect.poll(() => banner.evaluate((element) => element.getAnimations().length)).toBe(0);
  await expect(page.locator('.game-status')).toContainText('Best: 8');
});

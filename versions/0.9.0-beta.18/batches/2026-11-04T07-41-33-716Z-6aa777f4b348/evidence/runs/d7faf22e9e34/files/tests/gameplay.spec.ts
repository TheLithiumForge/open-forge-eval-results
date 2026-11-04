import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/boardCode.ts';
import { exported, loadBoard, reveal, solve, start } from './helpers.ts';

for (const size of SIZES) {
  test(`completes every pair on ${size}x${size}`, async ({ page }) => {
    await start(page);
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await solve(page, code);
    await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
    await expect(page.locator('.card.matched')).toHaveCount(size * size);
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
  });
}

test('starts on first reveal, ignores repeats and closes a miss at exactly 800 active ms', async ({ page }) => {
  await start(page, true);
  await loadBoard(page);
  await page.clock.runFor(5000);
  expect((await exported(page)).elapsedMs).toBe(0);
  await reveal(page, 0);
  await reveal(page, 0);
  expect((await exported(page)).moves).toBe(0);
  await reveal(page, 11);
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await reveal(page, 1);
  await reveal(page, 2);
  await reveal(page, 3);
  await page.clock.runFor(799);
  expect((await exported(page)).selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  await page.clock.runFor(1);
  const state = await exported(page);
  expect(state.selection).toEqual({ kind: 'closed' });
  expect(state.moves).toBe(2);
  expect(state.elapsedMs).toBe(800);
  await reveal(page, 2);
  await expect(page.locator('.card').nth(2)).toHaveAccessibleName(/cyan solid circle.*revealed/);
});

test('victory stops the clock and its single pulse ends after 600 ms', async ({ page }) => {
  await start(page, true);
  await loadBoard(page);
  await reveal(page, 0);
  await page.clock.runFor(1250);
  await reveal(page, 11);
  const code = 'np1-4-1';
  await solve(page, code);
  const before = await exported(page);
  expect(before.elapsedMs).toBe(1250);
  const banner = page.locator('.win-banner');
  const animation = await banner.evaluate((element) => getComputedStyle(element).animationDuration);
  expect(animation).toBe('0.6s');
  await page.clock.runFor(5000);
  expect((await exported(page)).elapsedMs).toBe(1250);
  await expect.poll(() => banner.evaluate((element) => element.getAnimations().length)).toBe(0);
});

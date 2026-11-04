import { expect, test } from '@playwright/test';
import { SIZES } from '../../src/game/boardCode.ts';
import { card, exportState, finish, freezeClock, loadBoard } from './helpers.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });
for (const size of SIZES) {
  test(`completes every pair on ${size}x${size}`, async ({ page }) => {
    test.setTimeout(300000);
    await loadBoard(page, `np1-${size}-42`);
    await finish(page, size);
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    const state = await exportState(page);
    expect(state.matched).toHaveLength(size * size);
    expect(state.moves).toBe(size * size / 2);
  });
}
test('repeated reveals, immediate matches and the exact active mismatch interval', async ({ page }) => {
  await loadBoard(page);
  await freezeClock(page);
  await card(page, 0).click();
  await card(page, 0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await card(page, 11).click();
  await expect(card(page, 0)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await card(page, 1).click();
  await card(page, 2).click();
  await card(page, 3).click();
  await expect(card(page, 3)).toHaveAccessibleName('Row 1, column 4, closed');
  await page.clock.runFor(799);
  await expect(card(page, 1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(card(page, 1)).toHaveAccessibleName(/closed$/);
  await expect(card(page, 2)).toHaveAccessibleName(/closed$/);
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
});
test('visibility pauses elapsed and remaining mismatch time together', async ({ page }) => {
  await loadBoard(page);
  await freezeClock(page);
  await card(page, 0).click();
  await card(page, 1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  const paused = await exportState(page);
  expect(paused.elapsedMs).toBe(300);
  expect(paused.selection).toMatchObject({ kind: 'mismatch', remainingMs: 500 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(card(page, 0)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(card(page, 0)).toHaveAccessibleName(/closed$/);
  expect((await exportState(page)).elapsedMs).toBe(800);
});
test('new deals and restart invalidate the earlier mismatch work and keep button focus', async ({ page }) => {
  await loadBoard(page);
  await freezeClock(page);
  for (const label of ['Restart', 'New Game']) {
    await card(page, 0).click();
    await card(page, 1).click();
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('button', { name: label, exact: true })).toBeFocused();
    await card(page, 0).click();
    await page.clock.runFor(1000);
    await expect(card(page, 0)).toHaveAccessibleName(/revealed$/);
    expect((await exportState(page)).moves).toBe(0);
    await loadBoard(page);
  }
});

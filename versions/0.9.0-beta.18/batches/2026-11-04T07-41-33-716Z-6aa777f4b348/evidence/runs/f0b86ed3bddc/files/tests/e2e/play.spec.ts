import { expect, test } from '@playwright/test';
import { SIZES } from '../../src/game/boardCode.ts';
import { createGame } from '../../src/game/state.ts';
import { CARDS, exported, finish, loadBoard, loadSnapshot } from './helpers.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });
for (const size of SIZES) {
  test(`finishes every pair on ${size}x${size}`, async ({ page }) => {
    await loadBoard(page, `np1-${size}-1`);
    await finish(page, `np1-${size}-1`, size > 4);
    await expect(page.getByText(`Moves: ${size ** 2 / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size ** 2 / 2}/${size ** 2 / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Best: ${size ** 2 / 2}`, { exact: true })).toBeVisible();
    await expect(page.locator(`${CARDS}[aria-disabled="true"]`)).toHaveCount(size ** 2);
  });
}
test('counts turns, ignores repeat/matched/mismatch activation, and closes at 800ms', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(60000);
  await loadBoard(page);
  const cards = page.locator(CARDS);
  await cards.nth(0).click();
  await cards.nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards.nth(11).click();
  // Native aria-disabled buttons remain focusable; bypass the automation guard to test the no-op.
  await cards.nth(11).click({ force: true });
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await cards.nth(1).click();
  await cards.nth(2).click();
  await cards.nth(3).click();
  await expect(cards.nth(3)).toHaveAccessibleName('Row 1, column 4, closed');
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(cards.nth(1)).toHaveClass(/revealed/);
  await page.clock.runFor(1);
  await expect(cards.nth(1)).not.toHaveClass(/revealed/);
  await expect(cards.nth(2)).not.toHaveClass(/revealed/);
});
test('new game and restart invalidate a pending mismatch', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(60000);
  await loadBoard(page);
  await page.locator(CARDS).nth(0).click();
  await page.locator(CARDS).nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.locator(CARDS).nth(2).click();
  await page.clock.runFor(1000);
  await expect(page.locator(CARDS).nth(2)).toHaveClass(/revealed/);
  const previous = (await exported(page)).board.code;
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  const next = await exported(page);
  expect(next.board.code).not.toBe(previous);
  expect(next.moves).toBe(0);
  expect(next.started).toBe(false);
});
test('best scores survive reload and only improve on played wins', async ({ page }) => {
  const almost = createGame('np1-4-1');
  const matched = Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11);
  for (const moves of [11, 11, 14, 8]) {
    await loadSnapshot(page, { ...almost, matched, moves: moves - 1, started: true });
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.locator(CARDS).nth(0).click();
    await page.locator(CARDS).nth(11).click();
    await expect(page.getByText(`Best: ${moves === 8 ? 8 : 11}`, { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await loadSnapshot(page, { ...almost, matched: Array.from({ length: 16 }, (_, i) => i), moves: 8, started: true });
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});
test('storage failure keeps all game actions available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Unavailable'); } });
  });
  await page.reload();
  await loadBoard(page);
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

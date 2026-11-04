import { test, expect } from '@playwright/test';
import { loadBoard, expectBoardSize, winPairs } from './helpers.ts';

test('finishes every supported board with exact pairs, moves and per-size bests', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');

  for (const size of [4, 6, 8, 10, 12, 14, 16] as const) {
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await expectBoardSize(page, size);
    await winPairs(page, code);
    const pairs = (size * size) / 2;
    await expect(page.locator('.game-summary')).toContainText(`Moves: ${pairs}`);
    await expect(page.locator('.game-summary')).toContainText(`Pairs: ${pairs}/${pairs}`);
    await expect(page.locator('.game-summary')).toContainText(`Best: ${pairs}`);
    await expect(page.getByText(`All pairs found in ${pairs} moves and 0:00.`, { exact: true })).toBeVisible();
  }
});

test('uses the same action for clicks, ignores repeats and matched cards, and blocks a mismatch', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');

  const firstClosed = page.getByRole('button', { name: 'Row 1, column 1, closed' });
  await firstClosed.click();
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeVisible();
  await page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' }).click();
  await expect(page.locator('.game-summary')).toContainText('Moves: 0');
  await page.getByRole('button', { name: 'Row 3, column 4, closed' }).click();
  await expect(page.locator('.game-summary')).toContainText('Pairs: 1/8');

  const matched = page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, matched' });
  await expect(matched).toHaveAttribute('aria-disabled', 'true');
  await matched.evaluate((element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error('A matched card should be a button.');
    element.click();
  });
  await expect(page.locator('.game-summary')).toContainText('Moves: 1');

  await page.getByRole('button', { name: 'Row 1, column 2, closed' }).click();
  await page.getByRole('button', { name: 'Row 1, column 3, closed' }).click();
  await expect(page.locator('.game-summary')).toContainText('Moves: 2');
  await page.getByRole('button', { name: 'Row 1, column 4, closed' }).click();
  await expect(page.locator('.game-summary')).toContainText('Moves: 2');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('No match. Cards close after a short pause.');
});

test('closes a mismatch at 800 active milliseconds and does not announce on close or tick', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');

  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await page.getByRole('button', { name: 'Row 1, column 2, closed' }).click();
  const liveEvent = await page.locator('[aria-live="polite"] span').elementHandle();
  await page.clock.runFor(799);
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeVisible();
  if (liveEvent === null) throw new Error('The miss announcement should exist.');
  expect(await liveEvent.evaluate((element) => element.textContent)).toBe('No match. Cards close after a short pause.');
  await page.clock.runFor(1);
  await expect(page.getByRole('button', { name: 'Row 1, column 1, closed' })).toBeVisible();
  expect(await liveEvent.evaluate((element) => element.isConnected)).toBe(true);
});

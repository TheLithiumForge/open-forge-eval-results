import { expect, test } from '@playwright/test';
import { exported, loadBoard, loadSnapshot, reveal, snapshot, start } from './helpers.ts';

test('hiding pauses the active clock and remaining mismatch time', async ({ page }) => {
  await start(page, true);
  await loadBoard(page);
  await reveal(page, 0);
  await reveal(page, 1);
  await page.clock.runFor(300);
  // Simulate the browser visibility event, without a production diagnostic hook.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  const hidden = await exported(page);
  expect(hidden.elapsedMs).toBe(300);
  expect(hidden.selection).toMatchObject({ kind: 'mismatch', remainingMs: 500 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  expect((await exported(page)).selection).toMatchObject({ remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
});

for (const action of ['Restart', 'New Game', 'Load board']) {
  test(`${action} invalidates pending mismatch callbacks`, async ({ page }) => {
    await start(page, true);
    await loadBoard(page);
    await reveal(page, 0);
    await reveal(page, 1);
    await page.clock.runFor(300);
    await page.getByRole('button', { name: action, exact: true }).click({ force: true });
    await reveal(page, 2);
    await page.clock.runFor(1500);
    const state = await exported(page);
    expect(state.moves).toBe(0);
    expect(state.matched).toEqual([]);
    expect(state.selection).toEqual({ kind: 'one', index: 2 });
  });
}

test('unfinished snapshot pauses both clocks, permits focus movement, and Resume restores focus', async ({ page }) => {
  await start(page, true);
  const text = snapshot({ matched: [0, 11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true });
  await loadSnapshot(page, text);
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.clock.runFor(5000);
  await reveal(page, 3);
  await page.locator('.card').nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  expect((await exported(page)).elapsedMs).toBe(1500);
  await page.getByRole('button', { name: 'Resume', exact: true }).click({ force: true });
  await expect(page.locator('.card').nth(2)).toBeFocused();
  await page.clock.runFor(299);
  expect((await exported(page)).selection).toMatchObject({ remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
});

test('caps continue play and mismatch resolution', async ({ page }) => {
  await start(page, true);
  await loadSnapshot(page, snapshot({ moves: 999999, elapsedMs: 359999999, started: true }));
  await page.getByRole('button', { name: 'Resume' }).click({ force: true });
  await reveal(page, 0);
  await reveal(page, 1);
  await page.clock.runFor(800);
  expect((await exported(page)).selection.kind).toBe('closed');
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await reveal(page, 0);
  await reveal(page, 11);
  expect((await exported(page)).moves).toBe(999999);
  await expect(page.locator('.card.matched')).toHaveCount(2);
});

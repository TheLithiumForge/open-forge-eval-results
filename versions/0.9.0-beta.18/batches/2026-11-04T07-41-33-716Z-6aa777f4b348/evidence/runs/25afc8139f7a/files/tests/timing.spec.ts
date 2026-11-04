import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { card, exported, frozenClock, openBoard } from './helpers.ts';

async function hidden(page: Page, value: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, value);
}

test('mismatch expires at 800 active ms before an equal-time activation', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  await card(page, 0).click();
  await card(page, 1).click();
  await page.clock.runFor(799);
  expect((await exported(page)).selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  await page.clock.runFor(1);
  await card(page, 2).click({ force: true });
  expect((await exported(page)).selection).toEqual({ kind: 'one', index: 2 });
  expect((await exported(page)).elapsedMs).toBe(800);
});

test('a delayed render cannot block activation after the logical mismatch deadline', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  await card(page, 0).click();
  await card(page, 1).click();
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.clock.runFor(800);
  await expect(page.locator('.card-revealed')).toHaveCount(2);
  await card(page, 2).click({ force: true });
  expect((await exported(page)).selection).toEqual({ kind: 'one', index: 2 });
});

test('hidden-page time pauses both elapsed time and a pending mismatch', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  await card(page, 0).click();
  await card(page, 1).click();
  await page.clock.runFor(200);
  await hidden(page, true);
  await page.clock.runFor(5000);
  const paused = await exported(page);
  expect(paused.elapsedMs).toBe(200);
  expect(paused.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 600 });
  await hidden(page, false);
  await page.clock.runFor(599);
  expect((await exported(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  expect((await exported(page)).elapsedMs).toBe(800);
});

for (const control of ['Restart', 'New Game']) {
  test(`${control} invalidates pending mismatch callbacks`, async ({ page }) => {
    await frozenClock(page);
    await openBoard(page);
    await card(page, 0).click();
    await card(page, 1).click();
    await page.clock.runFor(300);
    await page.getByRole('button', { name: control, exact: true }).click();
    await expect(page.getByRole('button', { name: control, exact: true })).toBeFocused();
    const state = await exported(page);
    expect(state.started).toBe(false);
    expect(state.moves).toBe(0);
    expect(state.elapsedMs).toBe(0);
    expect(state.board.code === 'np1-4-1').toBe(control === 'Restart');
    await card(page, 2).click();
    await page.clock.runFor(900);
    expect((await exported(page)).selection).toEqual({ kind: 'one', index: 2 });
    expect((await exported(page)).moves).toBe(0);
  });
}

test('time starts at the first reveal and supports minutes beyond 59', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  await page.clock.runFor(9000);
  expect((await exported(page)).elapsedMs).toBe(0);
  await card(page, 0).click();
  await page.clock.fastForward(3600000);
  await exported(page);
  await expect(page.locator('.game-status')).toContainText('Time: 60:00');
});

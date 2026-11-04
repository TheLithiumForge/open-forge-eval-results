import { test, expect, cards, loadBoard, exported, freezeClock } from './game.ts';

test('visibility changes pause both clock and pending mismatch, then resume their remaining time', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(250);
  // Headless Chromium has no OS tab-visibility control. Exercise the native event
  // boundary with a controlled visibilityState getter; all session code is real.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(10000);
  expect(await exported(page)).toMatchObject({ elapsedMs: 250,
    selection: { kind: 'mismatch', remainingMs: 550 } });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(549);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  expect((await exported(page)).elapsedMs).toBe(800);
});

test('timer settlement before an input action does not depend on a render tick', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await page.clock.runFor(999);
  expect((await exported(page)).elapsedMs).toBe(999);
  await page.clock.runFor(1);
  expect((await exported(page)).elapsedMs).toBe(1000);
});

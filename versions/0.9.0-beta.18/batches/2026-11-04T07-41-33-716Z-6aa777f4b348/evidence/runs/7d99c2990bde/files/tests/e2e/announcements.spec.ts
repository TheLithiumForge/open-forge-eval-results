import { expect, test } from '@playwright/test';
import { cards, frozenClock, loadBoard, playAll, watchAnnouncements } from './helpers.ts';

test('identical misses announce once each; navigation, clocks and closing stay quiet', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadBoard(page);
  await page.clock.runFor(200);
  const messages = await watchAnnouncements(page);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(page.locator('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('[aria-live]')).toHaveAttribute('aria-atomic', 'true');
  for (let turn = 0; turn < 2; turn++) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(799);
    await expect(page.locator('.card-revealed')).toHaveCount(2);
    await page.clock.runFor(1);
    await expect(page.locator('.card-revealed')).toHaveCount(0);
  }
  expect(messages).toEqual([
    'No match. Cards close after a short pause.',
    'No match. Cards close after a short pause.',
  ]);
  await page.clock.runFor(2000);
  expect(messages).toHaveLength(2);
});

test('rapid turns retain every queued result and final match includes win once', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadBoard(page);
  await page.clock.runFor(200);
  const messages = await watchAnnouncements(page);
  await playAll(page);
  await page.clock.runFor(1500);
  expect(messages).toEqual([
    'Pair found. 1 pair matched.',
    ...Array.from({ length: 6 }, (_, i) => `Pair found. ${i + 2} pairs matched.`),
    'Pair found. All pairs found in 8 moves and 0:00.',
  ]);
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
});

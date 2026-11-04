import { expect, test } from '@playwright/test';
import { card, loadBoard, pauseClock } from './helpers.ts';

test('a mismatch pauses and resumes with visible active milliseconds only', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await card(page, 0).focus();
  await page.keyboard.press('Enter');
  await card(page, 1).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(2500);
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, closed');
});

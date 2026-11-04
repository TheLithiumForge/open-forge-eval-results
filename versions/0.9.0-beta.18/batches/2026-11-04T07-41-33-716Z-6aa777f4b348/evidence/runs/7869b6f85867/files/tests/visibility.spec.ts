import { expect, test } from '@playwright/test';
import { cards, exportSnapshot, freezeClock, loadBoard } from './journey.ts';

test('visibility pauses elapsed time and the remaining mismatch together', async ({ page }) => {
  await page.goto('/'); await freezeClock(page); await loadBoard(page);
  await cards(page).nth(0).click(); await cards(page).nth(1).click();
  await page.clock.runFor(300);
  // Emulate the document visibility signal, without relying on headless tab occlusion.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(10000);
  const hidden = await exportSnapshot(page);
  expect(hidden).toMatchObject({ elapsedMs: 300, selection: { kind: 'mismatch', remainingMs: 500 } });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await cards(page).nth(2).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

import { expect, test } from '@playwright/test';
import { cards, frozen, loadBoard, loadSnapshot, nearWin, readSnapshot } from './gameDriver.ts';

declare global { interface Window { turnEvents: string[] } }
async function observe(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    window.turnEvents = [];
    const region = document.querySelector('[aria-live]');
    if (!region) throw new Error('Missing live region');
    new MutationObserver(() => { window.turnEvents.push(region.textContent ?? ''); })
      .observe(region, { childList: true, characterData: true, subtree: true });
  });
}

test('each turn announces once, including identical misses, without clock or focus repeats', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(page.locator('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('[aria-live]')).toHaveAttribute('aria-atomic', 'true');
  await observe(page);
  for (let turn = 0; turn < 2; turn += 1) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(800);
    await readSnapshot(page);
  }
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => window.turnEvents)).toEqual([
    'No match. Cards close after a short pause.', 'No match. Cards close after a short pause.', 'Pair found. 1 pair matched.',
  ]);
});

test('load events repeat once and a winning turn combines match and win', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await observe(page);
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await loadSnapshot(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => window.turnEvents)).toEqual([
    'Invalid board code.', 'Invalid board code.', 'Loaded snapshot. Select Resume to continue.',
    'Pair found. All pairs found in 8 moves and 0:01.',
  ]);
});

import { expect, test } from '@playwright/test';
import { cards, exported, frozen, loadBoard, loadSnapshot, snapshot } from './actions.ts';

test('visibility pauses both elapsed time and an unfinished mismatch', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(200);
  // Headless Chromium keeps background tabs visible. Simulate the visibility signal only.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  let state = await exported(page);
  expect(state.elapsedMs).toBe(200);
  expect(state.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 600 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(599);
  await expect(page.locator('.card-face')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card-face')).toHaveCount(0);
  state = await exported(page);
  expect(state.elapsedMs).toBe(800);
});

for (const action of ['New Game', 'Restart', 'size', 'board', 'snapshot']) {
  test(`a ${action} replacement invalidates earlier mismatch work`, async ({ page }) => {
    await frozen(page);
    await loadBoard(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(400);
    if (action === 'size') await page.getByLabel('Grid size', { exact: true }).selectOption('6');
    else if (action === 'board') await loadBoard(page, 'np1-4-2');
    else if (action === 'snapshot') {
      await loadSnapshot(page, snapshot());
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
    } else await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
    await cards(page).nth(0).click();
    await page.clock.runFor(1000);
    await expect(page.locator('.card-face')).toHaveCount(1);
    expect((await exported(page)).selection).toEqual({ kind: 'one', index: 0 });
  });
}

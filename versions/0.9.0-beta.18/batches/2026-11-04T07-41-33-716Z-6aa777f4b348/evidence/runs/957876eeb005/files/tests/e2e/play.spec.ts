import { expect, test } from '@playwright/test';
import { SUPPORTED_SIZES } from '../../src/game/board-code.ts';
import { cards, finishDeal, freezeClock, openGame } from './deal-actions.ts';

for (const size of SUPPORTED_SIZES) {
  test(`finishes every pair of ${size}x${size}`, async ({ page }) => {
    const code = `np1-${size}-1`;
    await openGame(page, code);
    await expect(cards(page)).toHaveCount(size * size);
    await finishDeal(page, code);
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(cards(page).locator('[aria-hidden="true"]').first()).toBeAttached();
    await expect(page.locator('.card[aria-disabled="true"]')).toHaveCount(size * size);
  });
}

test('reveals once, matches immediately, ignores matched input, and times a miss exactly', async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await page.clock.runFor(2000);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await cards(page).nth(0).click({ force: true });
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await expect(page.locator('.card--revealed')).toHaveCount(4);
  await page.clock.runFor(799);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName('Row 1, column 2, closed');
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(200);
  await expect(page.getByText('Time: 0:01', { exact: true })).toBeVisible();
});

test('hover, context menu and cancelled pointer do not reveal a card', async ({ page }) => {
  await openGame(page);
  const first = cards(page).first();
  await first.hover();
  await first.click({ button: 'right' });
  await page.keyboard.press('Escape');
  await first.dispatchEvent('pointercancel', { pointerType: 'touch' });
  await expect(first).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('audio, video, canvas')).toHaveCount(0);
});

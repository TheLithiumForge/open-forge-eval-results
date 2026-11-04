import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/deck.ts';
import { cards, finish, freezeTime, loadBoard } from './helpers.ts';

test('turn rules, exact active interval and stale timer invalidation', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await loadBoard(page);
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(cards(page).nth(1)).toHaveClass(/revealed/);
  // An activation synchronizes logical time even between render ticks.
  await page.clock.runFor(1);
  await cards(page).nth(3).click();
  await expect(cards(page).nth(1)).toHaveClass(/closed/);
  await expect(cards(page).nth(3)).toHaveClass(/revealed/);
  await cards(page).nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(2).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(2)).toHaveClass(/revealed/);
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await cards(page).nth(0).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(0)).toHaveClass(/revealed/);
});

test('visibility pauses both active clocks and continues the remaining interval', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await expect(cards(page).nth(0)).toHaveClass(/revealed/);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(cards(page).nth(0)).toHaveClass(/revealed/);
  await page.clock.runFor(1);
  await cards(page).nth(2).click();
  await expect(cards(page).nth(0)).toHaveClass(/closed/);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
});

for (const size of SIZES) test(`complete every pair on a ${size}x${size} board`, async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  const code = `np1-${size}-1`;
  await loadBoard(page, code);
  await expect(cards(page)).toHaveCount(size * size);
  await expect(page.getByLabel('Grid size')).toHaveValue(String(size));
  await finish(page, code);
  await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Best: ${size * size / 2}`, { exact: true })).toBeVisible();
});

test('drafts survive play and failed loads keep the game and saved size', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await cards(page).nth(0).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(cards(page).nth(0)).toHaveClass(/revealed/);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('invalid');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(cards(page).nth(0)).toHaveClass(/closed/);
});

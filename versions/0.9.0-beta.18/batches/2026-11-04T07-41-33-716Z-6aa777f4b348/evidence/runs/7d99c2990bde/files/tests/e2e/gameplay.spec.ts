import { expect, test } from '@playwright/test';
import { boardSizes } from '../../src/game/boardCode.ts';
import { cards, exported, frozenClock, loadBoard, playAll } from './helpers.ts';

for (const size of boardSizes) {
  test(`completes every pair on ${size}x${size}`, async ({ page }) => {
    if (size >= 14) test.setTimeout(240000);
    await page.goto('/');
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await expect(cards(page)).toHaveCount(size * size);
    await playAll(page, code);
    await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(cards(page).filter({ has: page.locator('.card-face') })).toHaveCount(size * size);
  });
}

test('one reveal, repeat, match and exact active mismatch interval', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadBoard(page);
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
  await cards(page).nth(3).click({ force: true });
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(page.locator('.card-revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card-revealed')).toHaveCount(0);
  const result = await exported(page);
  expect(result.moves).toBe(2);
  expect(result.elapsedMs).toBe(800);
});

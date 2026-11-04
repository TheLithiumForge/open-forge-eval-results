import { expect, test } from '@playwright/test';
import { supportedSizes } from '../src/game/boardCode.ts';
import { createGame } from '../src/game/game.ts';
import { cards, exported, frozen, loadBoard, loadSnapshot, snapshot } from './actions.ts';

for (const size of supportedSizes) {
  test(`finishes every pair on a ${size}x${size} board`, async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await loadBoard(page, `np1-${size}-1`);
    const game = createGame(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face += 1) {
      await cards(page).nth(game.deck.indexOf(face)).press('Enter');
      await cards(page).nth(game.deck.lastIndexOf(face)).press('Enter');
    }
    await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.locator('.card--matched')).toHaveCount(size * size);
    await expect(page.locator('[aria-live]')).toContainText(`All pairs found in ${size * size / 2} moves`);
  });
}

test('counts one move per second reveal and resolves exactly 800 active milliseconds', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await page.clock.runFor(10000);
  expect((await exported(page)).elapsedMs).toBe(0);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.clock.runFor(1250);
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await cards(page).nth(0).click({ force: true });
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click({ force: true });
  await page.clock.runFor(799);
  await expect(page.locator('.card-face')).toHaveCount(4);
  await page.clock.runFor(1);
  await expect(page.locator('.card-face')).toHaveCount(2);
  const state = await exported(page);
  expect(state.moves).toBe(2);
  expect(state.elapsedMs).toBe(2050);
});

test('caps counters while allowing mismatch expiry and completion', async ({ page }) => {
  await frozen(page);
  await loadSnapshot(page, snapshot({ moves: 999999, elapsedMs: 359999999, started: true }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(800);
  await expect(page.locator('.card-face')).toHaveCount(0);
  const game = createGame('np1-4-1');
  for (let face = 0; face < 8; face += 1) {
    await cards(page).nth(game.deck.indexOf(face)).click();
    await cards(page).nth(game.deck.lastIndexOf(face)).click();
  }
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  const final = await exported(page);
  await page.clock.runFor(10000);
  expect(await exported(page)).toEqual(final);
});

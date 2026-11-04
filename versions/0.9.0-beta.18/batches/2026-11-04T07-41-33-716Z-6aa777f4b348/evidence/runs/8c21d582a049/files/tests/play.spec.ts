import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/boardCode.ts';
import { cards, exported, finish, live, loadBoard, openGame, statistics } from './game.ts';

for (const size of SIZES) {
  test(`finishes every pair on ${size}x${size} (R01, R03, R06, R10)`, async ({ page }) => {
    await openGame(page);
    await loadBoard(page, `np1-${size}-1`);
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue(String(size));
    await expect(cards(page)).toHaveCount(size ** 2);
    await finish(page, `np1-${size}-1`);
    await expect(statistics(page)).toContainText(`Moves: ${size ** 2 / 2}`);
    await expect(statistics(page)).toContainText(`Pairs: ${size ** 2 / 2}/${size ** 2 / 2}`);
    await expect(statistics(page)).toContainText(`Best: ${size ** 2 / 2}`);
    await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
    await expect(cards(page).locator('[aria-disabled="true"]')).toHaveCount(0);
    await expect(page.locator('.card[aria-disabled="true"]')).toHaveCount(size ** 2);
    const final = await exported(page);
    await page.clock.runFor(2500);
    expect((await exported(page)).elapsedMs).toBe(final.elapsedMs);
  });
}

test('exact turns, ignored activations and the active mismatch boundary (R02–R07)', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  await page.clock.runFor(6000);
  expect((await exported(page)).elapsedMs).toBe(0);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(statistics(page)).toContainText('Moves: 0');
  await cards(page).nth(11).click();
  await expect(statistics(page)).toContainText('Pairs: 1/8');
  await expect(live(page)).toHaveText('Pair found. 1 pair matched.');
  await cards(page).nth(0).click({ force: true });
  await cards(page).nth(1).click(); await cards(page).nth(2).click();
  await expect(statistics(page)).toContainText('Moves: 2');
  await expect(live(page)).toHaveText('No match. Cards close after a short pause.');
  await cards(page).nth(3).click();
  await cards(page).nth(3).press('ArrowRight');
  await expect(cards(page).nth(3)).toHaveAccessibleName('Row 1, column 4, closed');
  await page.clock.runFor(799);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName('Row 1, column 2, closed');
  expect((await exported(page)).moves).toBe(2);
});

test('visibility changes pause elapsed and the same mismatch interval (R04, R07)', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  await cards(page).nth(0).click(); await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(10000);
  const hidden = await exported(page);
  expect(hidden.elapsedMs).toBe(300);
  expect(hidden.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 500 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  expect((await exported(page)).elapsedMs).toBe(800);
});

for (const name of ['New Game', 'Restart']) {
  test(`${name} invalidates an earlier mismatch (R09, R12, C13)`, async ({ page }) => {
    await openGame(page); await loadBoard(page);
    await cards(page).nth(0).click(); await cards(page).nth(1).click();
    await page.clock.runFor(400);
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
    const code = await page.getByLabel('Board code', { exact: true }).inputValue();
    expect(code === 'np1-4-1').toBe(name === 'Restart');
    await cards(page).nth(2).click();
    await page.clock.runFor(1000);
    await expect(cards(page).nth(2)).toHaveAccessibleName(/revealed$/);
    await expect(statistics(page)).toContainText('Moves: 0');
    expect((await exported(page)).matched).toEqual([]);
  });
}

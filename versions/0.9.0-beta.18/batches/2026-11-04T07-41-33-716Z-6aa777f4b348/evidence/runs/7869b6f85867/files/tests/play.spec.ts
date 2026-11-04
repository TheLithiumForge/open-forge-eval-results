import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/board-code.ts';
import { cards, completeSnapshot, exportSnapshot, finish, freezeClock, live, loadBoard, loadSnapshot } from './journey.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('matches, misses, ignores repeated activations and expires at 800ms', async ({ page }) => {
  await freezeClock(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(live(page)).toHaveText('Pair found. 1 pair matched.');
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.locator('.card.revealed:not(.matched)')).toHaveCount(2);
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(page.locator('.card.revealed:not(.matched)')).toHaveCount(2);
  // The clock settles at activation too, even between display ticks.
  await page.clock.runFor(1);
  await cards(page).nth(3).click();
  await expect(page.locator('.card.revealed:not(.matched)')).toHaveCount(1);
});

test('new and restarted deals invalidate pending mismatches', async ({ page }) => {
  await freezeClock(page);
  await loadBoard(page);
  await cards(page).nth(0).click(); await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await cards(page).nth(0).click();
  await page.clock.runFor(1000);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('right click, hover and pointer cancellation do not reveal a card', async ({ page }) => {
  await cards(page).first().hover();
  await cards(page).first().click({ button: 'right' });
  await cards(page).first().dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1 });
  await cards(page).first().dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 1 });
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('size and best moves persist while progress starts fresh', async ({ page }) => {
  for (const moves of [15, 15, 18, 9]) {
    await loadSnapshot(page, completeSnapshot(4, moves - 1, false));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(2).click(); await cards(page).nth(6).click();
    await expect(page.getByText(`Best: ${moves === 9 ? 9 : 15}`, { exact: true })).toBeVisible();
  }
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByLabel('Grid size').selectOption('4');
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
});

for (const size of SIZES) {
  test(`finishes all ${size}x${size} pairs`, async ({ page }) => {
    test.setTimeout(120000);
    await loadBoard(page, `np1-${size}-1`);
    await finish(page, size);
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.locator('.card.matched')).toHaveCount(size * size);
    await expect(live(page)).toContainText(`Pair found. All pairs found in ${size * size / 2} moves and `);
    const before = await exportSnapshot(page);
    await page.waitForTimeout(60);
    expect(await exportSnapshot(page)).toEqual(before);
  });
}

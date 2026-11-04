import { test, expect, cards, status, loadBoard, freezeClock, exported, loadSnapshot, blankSnapshot } from './game.ts';
import { createGame } from '../../src/game/state.ts';

for (const size of [4, 6, 8, 10, 12, 14, 16]) {
  test(`complete a ${size}x${size} deal through native card buttons`, async ({ page }) => {
    await freezeClock(page);
    await page.goto('/');
    await loadBoard(page, `np1-${size}-1`);
    const state = createGame(`np1-${size}-1`);
    if (!state) throw new Error('Invalid fixture board');
    await expect(cards(page)).toHaveCount(size ** 2);
    for (let face = 0; face < size ** 2 / 2; face += 1) {
      for (const [index, value] of state.deck.entries()) {
        if (value === face) await cards(page).nth(index).click();
      }
    }
    await expect(status(page, 'Pairs')).toHaveText(`Pairs: ${size ** 2 / 2}/${size ** 2 / 2}`);
    await expect(status(page, 'Moves')).toHaveText(`Moves: ${size ** 2 / 2}`);
    await expect(status(page, 'Best')).toHaveText(`Best: ${size ** 2 / 2}`);
    await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
    await expect(cards(page).filter({ has: page.locator('svg') })).toHaveCount(size ** 2);
    await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
    const final = await exported(page);
    await page.clock.runFor(10000);
    expect((await exported(page)).elapsedMs).toBe(final.elapsedMs);
  });
}

test('first, ignored and second reveals count exactly; a mismatch closes at 800ms', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await page.clock.runFor(5000);
  await expect(status(page, 'Time')).toHaveText('Time: 0:00');
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(status(page, 'Moves')).toHaveText('Moves: 0');
  await cards(page).nth(11).click();
  await expect(status(page, 'Pairs')).toHaveText('Pairs: 1/8');
  await cards(page).nth(11).click({ force: true });
  await expect(status(page, 'Moves')).toHaveText('Moves: 1');
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click({ force: true });
  await expect(status(page, 'Moves')).toHaveText('Moves: 2');
  await page.clock.runFor(799);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await expect(cards(page).nth(2)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName('Row 1, column 2, closed');
  await expect(cards(page).nth(2)).toHaveAccessibleName('Row 1, column 3, closed');
  await page.clock.runFor(200);
  await expect(status(page, 'Time')).toHaveText('Time: 0:01');
});

for (const action of ['Restart', 'New Game', 'size', 'board', 'snapshot']) {
  test(`${action} invalidates a previous mismatch timer`, async ({ page }) => {
    await freezeClock(page);
    await page.goto('/');
    await loadBoard(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(400);
    if (action === 'size') await page.getByLabel('Grid size').selectOption('6');
    else if (action === 'board') await loadBoard(page, 'np1-6-1');
    else if (action === 'snapshot') {
      await loadSnapshot(page, blankSnapshot);
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
    } else await page.getByRole('button', { name: action, exact: true }).click();
    await cards(page).nth(0).click();
    await page.clock.runFor(1000);
    await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
    await expect(status(page, 'Moves')).toHaveText('Moves: 0');
    await expect(status(page, 'Pairs')).toContainText('Pairs: 0/');
  });
}

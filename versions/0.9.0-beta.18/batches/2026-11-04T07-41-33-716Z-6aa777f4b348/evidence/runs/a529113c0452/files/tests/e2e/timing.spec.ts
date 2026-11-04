import { expect, test } from '@playwright/test';
import { encodeSnapshot } from '../../src/game/snapshot.ts';
import { cards, deal, exportProgress, loadBoard, loadProgress, openGame, stat } from './support.ts';

test('misses close at 800 active milliseconds and ignore intervening activation', async ({ page }) => {
  await openGame(page, true);
  await loadBoard(page);
  await page.clock.runFor(2000);
  await expect(stat(page, 'Time')).toHaveText('Time: 0:00');
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(799);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await expect(stat(page, 'Moves')).toHaveText('Moves: 1');
  expect((await exportProgress(page)).elapsedMs).toBe(800);
});

test('visibility pauses both elapsed time and mismatch deadline', async ({ page }) => {
  await openGame(page, true);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(250);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  const hidden = await exportProgress(page);
  expect(hidden.elapsedMs).toBe(250);
  expect(hidden.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 550 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(549);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  expect((await exportProgress(page)).elapsedMs).toBe(800);
});

for (const action of ['New Game', 'Restart']) {
  test(`${action} invalidates an earlier mismatch`, async ({ page }) => {
    await openGame(page, true);
    await loadBoard(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(400);
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('button', { name: action, exact: true })).toBeFocused();
    if (action === 'Restart') await expect(page.getByLabel('Board code')).toHaveValue('np1-4-1');
    else await expect(page.getByLabel('Board code')).not.toHaveValue('np1-4-1');
    await expect(stat(page, 'Moves')).toHaveText('Moves: 0');
    await cards(page).nth(2).click();
    await page.clock.runFor(1000);
    await expect(page.locator('.card--revealed')).toHaveCount(1);
    await expect(cards(page).nth(2)).toHaveAccessibleName(/revealed$/);
    await expect(stat(page, 'Pairs')).toHaveText('Pairs: 0/8');
  });
}

test('clock and move caps do not prevent further turns or completion', async ({ page }) => {
  await openGame(page, true);
  const game = deal();
  await loadProgress(page, encodeSnapshot({ ...game, started: true, moves: 999999, elapsedMs: 359999999,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 } }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  for (let face = 0; face < 8; face += 1) {
    await cards(page).nth(game.board.deck.indexOf(face)).click();
    await cards(page).nth(game.board.deck.lastIndexOf(face)).click();
  }
  await expect(stat(page, 'Moves')).toHaveText('Moves: 999999');
  await expect(stat(page, 'Time')).toHaveText('Time: 5999:59');
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
});

test('visibility return schedules a one-millisecond remaining mismatch immediately', async ({ page }) => {
  await openGame(page, true);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(799);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(1000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  expect((await exportProgress(page)).elapsedMs).toBe(800);
});

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { card, exported, frozenClock, loadBoard, loadSnapshot, nearlyCompleteText } from './gameActions.ts';

async function visibility(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('hidden-page time pauses both clocks and resumes the remaining interval', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadBoard(page);
  await card(page, 0).click();
  await card(page, 1).click();
  await page.clock.runFor(300);
  await visibility(page, true);
  const hidden = await exported(page);
  expect(hidden.elapsedMs).toBe(300);
  expect(hidden.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 500 });
  await page.clock.runFor(5000);
  expect(await exported(page)).toEqual(hidden);
  await visibility(page, false);
  await page.clock.runFor(499);
  expect((await exported(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect((await exported(page)).selection.kind).toBe('closed');
  expect((await exported(page)).elapsedMs).toBe(800);
});

for (const action of ['New Game', 'Restart', 'size', 'Load board', 'Load snapshot'] as const) {
  test(`${action} invalidates an earlier mismatch callback`, async ({ page }) => {
    await frozenClock(page);
    await page.goto('/');
    await loadBoard(page);
    await card(page, 0).click();
    await card(page, 1).click();
    await page.clock.runFor(300);
    if (action === 'size') await page.getByLabel('Grid size', { exact: true }).selectOption('6');
    else if (action === 'Load board') await loadBoard(page, 'np1-4-42');
    else if (action === 'Load snapshot') {
      await loadSnapshot(page, nearlyCompleteText());
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
    } else await page.getByRole('button', { name: action, exact: true }).click();
    const index = action === 'Load snapshot' ? 12 : 0;
    await card(page, index).click();
    await page.clock.runFor(1000);
    expect((await exported(page)).selection).toEqual({ kind: 'one', index });
    expect((await exported(page)).moves).toBe(action === 'Load snapshot' ? 7 : 0);
  });
}

test('new seeds differ while Restart repeats the code and clears progress', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await card(page, 0).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  let game = await exported(page);
  expect(game.board.code).toBe('np1-4-1');
  expect(game.started).toBe(false);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  game = await exported(page);
  expect(game.board.code).not.toBe('np1-4-1');
  expect(game.board.size).toBe(4);
});

test('capped moves and clock still allow victory', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadSnapshot(page, nearlyCompleteText(999999, 359999999));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(2000);
  await card(page, 12).click();
  await card(page, 13).click();
  await expect(page.locator('.game-status')).toContainText('Moves: 999999');
  await expect(page.locator('.game-status')).toContainText('Time: 5999:59');
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
});

import { test, expect, cards, status, live, loadBoard, loadSnapshot, exported, freezeClock,
  blankSnapshot, pendingSnapshot, almostWon, finishLastPair } from './game.ts';

test('board draft, exact labels, errors and control focus preserve the current deal', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size').locator('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await loadBoard(page, '  np1-4-1  ');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-01');
  await cards(page).nth(0).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid board code.');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await expect(cards(page).nth(0)).toHaveAttribute('tabindex', '0');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
});

test('snapshot export, validation, paused navigation, Resume focus and remaining active time', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadSnapshot(page, pendingSnapshot);
  await expect(live(page)).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(status(page, 'Pairs')).toHaveText('Pairs: 1/8');
  await page.clock.runFor(10000);
  await cards(page).nth(4).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(cards(page).nth(5)).toHaveAccessibleName(/closed$/);
  expect(await exported(page)).toMatchObject({ moves: 2, elapsedMs: 1500,
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 } });
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
  await expect(cards(page).nth(2)).toHaveAccessibleName(/closed$/);
  expect((await exported(page)).elapsedMs).toBe(1800);
  await cards(page).nth(1).click();
  const before = await exported(page);
  const invalid = JSON.stringify({ ...blankSnapshot, surprise: true });
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(invalid);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(invalid);
  expect(await exported(page)).toEqual(before);
});

test('completed imports stay static without updating best; unfinished imported wins record best', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadSnapshot(page, { ...blankSnapshot, matched: Array.from({ length: 16 }, (_, i) => i),
    moves: 8, elapsedMs: 61000, started: true });
  await expect(live(page)).toHaveText('Loaded completed snapshot.');
  await expect(status(page, 'Best')).toHaveText('Best: none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  expect(await page.locator('.win-banner').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await loadSnapshot(page, almostWon(7, 61000));
  await finishLastPair(page);
  await expect(status(page, 'Best')).toHaveText('Best: 8');
  await expect(live(page)).toHaveText('Pair found. All pairs found in 8 moves and 1:01.');
  expect(await page.locator('.win-banner').evaluate((e) => getComputedStyle(e).animationDuration)).toBe('0.6s');
  await page.clock.runFor(601);
  expect(await page.locator('.win-banner').evaluate((e) => getComputedStyle(e).animationIterationCount)).toBe('1');
  // CSS animations use the rendering timeline, independently of the JS clock.
  await expect.poll(() => page.locator('.win-banner').evaluate((e) => e.getAnimations().length)).toBe(0);
});

test('move and clock caps allow subsequent mismatch, match and completion', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadSnapshot(page, { ...blankSnapshot, moves: 999999, elapsedMs: 359999999, started: true });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(800);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(status(page, 'Moves')).toHaveText('Moves: 999999');
  await expect(status(page, 'Time')).toHaveText('Time: 5999:59');
  await expect(status(page, 'Pairs')).toHaveText('Pairs: 1/8');
  await loadSnapshot(page, almostWon(999999, 359999999));
  await finishLastPair(page);
  await expect(page.locator('.win-banner')).toContainText('999999 moves and 5999:59');
});

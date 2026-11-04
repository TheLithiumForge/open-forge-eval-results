import { expect, test } from '@playwright/test';
import { cards, exportSnapshot, loadBoard, loadSnapshot, pauseClock, snapshot, solve } from './helpers.ts';

test('turn rules, exact active delay, repeated activation and stale deal timers', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.locator('.status')).toContainText('Moves: 0');
  await cards(page).nth(11).click();
  await expect(page.locator('.status')).toContainText('Moves: 1');
  await expect(page.locator('.status')).toContainText('Pairs: 1/8');
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.locator('.status')).toContainText('Moves: 2');
  await page.clock.runFor(799);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(32);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await cards(page).nth(0).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await expect(page.locator('.status')).toContainText('Moves: 0');
  await cards(page).nth(1).click();
  const oldCode = await page.getByLabel('Board code', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue(oldCode);
  await cards(page).first().click();
  await page.clock.runFor(1000);
  await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
});

for (const size of [4, 6, 8, 10, 12, 14, 16]) {
  test(`completes a ${size}x${size} game`, async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('/');
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await solve(page, code);
    await expect(page.getByRole('heading', { name: 'All pairs found.' })).toBeVisible();
    await expect(page.locator('.status')).toContainText(`Moves: ${size * size / 2}`);
    await expect(page.locator('.status')).toContainText(`Pairs: ${size * size / 2}/${size * size / 2}`);
    await expect(page.locator('.status')).toContainText(`Best: ${size * size / 2}`);
    await expect(page.locator('.card.matched')).toHaveCount(size * size);
    const end = await exportSnapshot(page);
    await page.waitForTimeout(100);
    expect((await exportSnapshot(page)).elapsedMs).toBe(end.elapsedMs);
  });
}

test('hidden-page active time pauses elapsed and a pending mismatch', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(256);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await exportSnapshot(page);
  await page.clock.runFor(10000);
  expect(await exportSnapshot(page)).toEqual(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(500);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(64);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('caps preserve game play, timer rendering and completion', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadSnapshot(page, snapshot({ started: true, moves: 999999, elapsedMs: 359999999 }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(816);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await solve(page);
  await expect(page.locator('.win-banner')).toContainText('999999 moves · 5999:59');
  await expect(page.locator('.status')).toContainText('Best: 999999');
});

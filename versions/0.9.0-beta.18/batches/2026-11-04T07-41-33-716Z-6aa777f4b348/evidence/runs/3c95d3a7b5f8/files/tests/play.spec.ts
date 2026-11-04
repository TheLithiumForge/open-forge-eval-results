import { expect, test } from '@playwright/test';
import { GRID_SIZES } from '../src/game/boardCode.ts';
import { cards, exported, finish, frozenPage, loadBoard, live } from './support.ts';

for (const size of GRID_SIZES) {
  test(`completes all pairs on ${size}x${size}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await loadBoard(page, `np1-${size}-1`);
    await expect(cards(page)).toHaveCount(size * size);
    await finish(page, `np1-${size}-1`);
    await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.locator('.card--matched')).toHaveCount(size * size);
    const completed = await exported(page);
    await page.waitForTimeout(50);
    expect((await exported(page)).elapsedMs).toBe(completed.elapsedMs);
  });
}

test('counts only second eligible reveals and expires before an equal-time action', async ({ page }) => {
  await frozenPage(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(page.locator('.card--matched')).toHaveCount(2);
  await cards(page).nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await expect(live(page)).toHaveText('No match. Cards close after a short pause.');
  await cards(page).nth(3).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(799);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('.card--revealed')).toHaveCount(1);
  await expect(cards(page).nth(3)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
});

test('pauses active time and mismatch while the visibility lifecycle is hidden', async ({ page }) => {
  await frozenPage(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(250);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  const hidden = await exported(page);
  expect(hidden.elapsedMs).toBe(250);
  expect(hidden.selection).toMatchObject({ kind: 'mismatch', remainingMs: 550 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(549);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await cards(page).nth(2).focus();
  await page.keyboard.press('Enter');
  expect((await exported(page)).elapsedMs).toBe(800);
  await expect(page.locator('.card--revealed')).toHaveCount(1);
});

for (const label of ['New Game', 'Restart']) {
  test(`${label} invalidates an earlier mismatch and resets board focus`, async ({ page }) => {
    await frozenPage(page);
    await loadBoard(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(300);
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('button', { name: label, exact: true })).toBeFocused();
    await expect(page.locator('.card[tabindex="0"]')).toHaveAttribute('data-position', '0');
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    await expect(page.locator('.card--revealed, .card--matched')).toHaveCount(0);
    const code = await page.getByLabel('Board code', { exact: true }).inputValue();
    expect(code === 'np1-4-1').toBe(label === 'Restart');
    await cards(page).nth(3).click();
    await page.clock.runFor(1000);
    await expect(cards(page).nth(3)).toHaveAccessibleName(/revealed$/);
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  });
}

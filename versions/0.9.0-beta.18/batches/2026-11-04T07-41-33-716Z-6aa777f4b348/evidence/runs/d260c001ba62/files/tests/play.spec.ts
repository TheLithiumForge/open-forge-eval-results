import { expect, test } from '@playwright/test';
import { cards, exported, finish, loadBoard } from './helpers.ts';
import { SIZES } from '../src/game/boardCode.ts';

test('a fresh deal is private, counts valid reveals and resolves a miss', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.locator('.card svg')).toHaveCount(0);
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(page.locator('body')).toBeFocused();
  await loadBoard(page);
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.locator('.scoreboard')).toContainText('Moves: 0');
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await cards(page).nth(11).click();
  await expect(page.locator('.scoreboard')).toContainText('Pairs: 1/8');
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.locator('.scoreboard')).toContainText('Moves: 2');
  await page.clock.runFor(799);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('[aria-live]')).toHaveText('No match. Cards close after a short pause.');
});

test('Restart and New Game invalidate old mismatch work and keep control focus', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const button of ['Restart', 'New Game']) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    const oldCode = await page.getByLabel('Board code', { exact: true }).inputValue();
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(page.getByRole('button', { name: button, exact: true })).toBeFocused();
    const code = await page.getByLabel('Board code', { exact: true }).inputValue();
    if (button === 'Restart') expect(code).toBe(oldCode); else expect(code).not.toBe(oldCode);
    await expect(page.locator('.scoreboard')).toContainText('Moves: 0');
    await cards(page).nth(0).click();
    await page.clock.runFor(1200);
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
  }
});

for (const size of SIZES) test(`complete ${size}x${size} with complete pairs`, async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, size);
  await finish(page, size);
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.card.matched')).toHaveCount(size * size);
  await expect(page.locator('.scoreboard')).toContainText(`Moves: ${size * size / 2}`);
  await expect(page.locator('.scoreboard')).toContainText(`Best: ${size * size / 2}`);
  const final = await exported(page);
  await page.waitForTimeout(100);
  expect(await exported(page)).toBe(final);
});

test('best scores and size survive reload; active progress does not', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await page.evaluate(() => localStorage.setItem('unrelated-key', 'keep me'));
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await finish(page);
  await expect(page.locator('.scoreboard')).toContainText('Best: 9');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await finish(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await finish(page);
  await expect(page.locator('.scoreboard')).toContainText('Best: 8');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.waitForTimeout(850);
  await finish(page);
  await expect(page.locator('.scoreboard')).toContainText('Best: 8');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(page.locator('.scoreboard')).toContainText('Moves: 0');
  await page.getByLabel('Grid size', { exact: true }).selectOption('4');
  await expect(page.locator('.scoreboard')).toContainText('Best: 8');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-key'))).toBe('keep me');
});

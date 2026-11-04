import { expect, test } from '@playwright/test';
import { generateDeck, SIZES } from '../src/game/boardCode.ts';
import { cards, exportedState, freezeClock, loadBoard, solve } from './helpers.ts';

test('native controls, concealed identities, exact turns and pending-timer resets', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, closed', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await loadBoard(page, '  np1-4-1  ');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await expect(page.locator('.card svg')).toHaveCount(0);
  expect(await cards(page).first().evaluate(button => button.outerHTML)).not.toMatch(/face|data-|cyan|circle/);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.locator('.status-strip')).toContainText('Moves: 0');
  await cards(page).nth(11).click();
  await expect(page.locator('.status-strip')).toContainText('Moves: 1');
  await expect(page.locator('.status-strip')).toContainText('Pairs: 1/8');
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.locator('.status-strip')).toContainText('Moves: 2');
  await expect(page.locator('.card.revealed')).toHaveCount(4);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await cards(page).nth(3).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(3)).toHaveAccessibleName(/revealed$/);
  await expect(page.locator('.status-strip')).toContainText('Moves: 0');
  await cards(page).nth(1).click();
  const old = await page.getByLabel('Board code', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  expect(await page.getByLabel('Board code', { exact: true }).inputValue()).not.toBe(old);
  await cards(page).nth(0).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
});

for (const size of SIZES) {
  test(`complete every pair on ${size}x${size}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await loadBoard(page, `np1-${size}-1`);
    await solve(page, generateDeck(size, 1));
    await expect(page.locator('.status-strip')).toContainText(`Moves: ${size * size / 2}`);
    await expect(page.locator('.status-strip')).toContainText(`Best: ${size * size / 2}`);
    await expect(page.locator('.card.matched')).toHaveCount(size * size);
    const state = await exportedState(page);
    expect(state.matched).toHaveLength(size * size);
    const elapsed = state.elapsedMs;
    expect((await exportedState(page)).elapsedMs).toBe(elapsed);
  });
}

test('active mismatch time pauses with visibility and resolves at 800ms', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(400);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const paused = await exportedState(page);
  await page.clock.runFor(5000);
  expect((await exportedState(page)).elapsedMs).toBe(paused.elapsedMs);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(399);
  expect((await exportedState(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect((await exportedState(page)).selection.kind).toBe('closed');
});

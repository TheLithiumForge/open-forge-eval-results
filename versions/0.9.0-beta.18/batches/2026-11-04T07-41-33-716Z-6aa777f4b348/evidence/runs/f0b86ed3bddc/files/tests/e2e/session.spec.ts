import { expect, test } from '@playwright/test';
import { CARDS, exported, loadBoard } from './helpers.ts';
import { PREFERENCES_KEY } from '../../src/game/session/storage.ts';

test('visibility pauses both active clocks and resumes their remaining time', async ({ page }) => {
  await page.goto('/');
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(60000);
  await loadBoard(page);
  await page.locator(CARDS).nth(0).click();
  await page.locator(CARDS).nth(1).click();
  await page.clock.runFor(200);
  // Headless Chromium keeps tabs visible; drive the browser visibility boundary directly.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  const hidden = await exported(page);
  expect(hidden.elapsedMs).toBe(200);
  expect(hidden.selection).toMatchObject({ remainingMs: 600 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(599);
  await expect(page.locator(CARDS).nth(0)).toHaveClass(/revealed/);
  await page.clock.runFor(1);
  await expect(page.locator(CARDS).nth(0)).not.toHaveClass(/revealed/);
  expect((await exported(page)).elapsedMs).toBe(800);
});
test('hover, cancellation and the normal context menu do not reveal cards', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const first = page.locator(CARDS).nth(0);
  await first.hover();
  await expect(first).toHaveCSS('border-top-color', 'rgb(244, 246, 255)');
  await first.click({ button: 'right' });
  await page.keyboard.press('Escape');
  await first.dispatchEvent('pointercancel');
  await expect(first).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});
test('new game during a mismatch invalidates its timeout and resets the remembered tab stop', async ({ page }) => {
  await page.goto('/');
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(60000);
  await loadBoard(page);
  await page.locator(CARDS).nth(0).click();
  await page.locator(CARDS).nth(1).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.locator(`${CARDS}[tabindex="0"]`)).toHaveAccessibleName('Row 1, column 1, closed');
  await page.locator(CARDS).nth(2).click();
  await page.clock.runFor(1000);
  await expect(page.locator(CARDS).nth(2)).toHaveClass(/revealed/);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});
test('saved preferences are validated and failed loads preserve the saved size and unrelated keys', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => {
    localStorage.setItem(key, JSON.stringify({ size: '16', bests: { 4: -1, 6: 2.5, 8: 1000000 } }));
    localStorage.setItem('unrelated', 'keep');
  }, PREFERENCES_KEY);
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.getByLabel('Grid size').selectOption('8');
  await loadBoard(page, 'np1-6-0');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
});

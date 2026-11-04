import { expect, test } from '@playwright/test';
import { cards, frozen, loadBoard } from './actions.ts';

test('one remembered tab stop, edge stops, native tab exit and matched focus', async ({ page }) => {
  await frozen(page);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).nth(0)).toBeFocused();
  for (let step = 0; step < 4; step += 1) await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  for (let step = 0; step < 4; step += 1) await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(15)).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(15)).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).focus();
  await page.keyboard.press('Space');
  await expect(cards(page).nth(11)).toHaveAttribute('aria-disabled', 'true');
  expect(await cards(page).nth(11).evaluate((node) => node instanceof HTMLButtonElement && !node.disabled)).toBe(true);
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(11)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
});

test('hover, canceled pointer and the native context menu leave cards closed', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).hover();
  await cards(page).nth(0).dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1 });
  await cards(page).nth(0).dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 1 });
  await expect(page.locator('.card-face')).toHaveCount(0);
  await cards(page).nth(0).evaluate((node) => {
    node.addEventListener('contextmenu', (event) => {
      queueMicrotask(() => node.setAttribute('data-test-context-prevented', String(event.defaultPrevented)));
    }, { once: true });
  });
  await cards(page).nth(0).click({ button: 'right' });
  await expect(cards(page).nth(0)).toHaveAttribute('data-test-context-prevented', 'false');
  await expect(page.locator('.card-face')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await cards(page).nth(0).click();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await expect(page.locator('.card-face')).toHaveCount(1);
});

test('hidden cards disclose the same DOM across distinct deals', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const first = await page.locator('.board-grid').innerHTML();
  await loadBoard(page, 'np1-4-2');
  expect(await page.locator('.board-grid').innerHTML()).toBe(first);
  expect(first).not.toContain('card-face');
  expect(first).not.toMatch(/cyan|magenta|marker|face-id|data-face/);
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  await cards(page).nth(0).click();
  await expect(page.locator('.card-face')).toHaveCount(1);
  expect(await page.locator('canvas, audio, video').count()).toBe(0);
});

test.describe('touch activation', () => {
  test.use({ hasTouch: true });
  test('completed taps use the same reveal and matching action', async ({ page }) => {
    await page.goto('/');
    await loadBoard(page);
    await cards(page).nth(0).tap();
    await cards(page).nth(11).tap();
    await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
    await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  });
});

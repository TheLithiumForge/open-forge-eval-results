import { expect, test } from '@playwright/test';
import { activate, freezeTime, loadBoard } from './helpers.ts';

test('one remembered stop, native Tab exits, edge arrows and matched focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  await loadBoard(page);
  const cards = page.locator('.card');
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await activate(page, 0);
  await activate(page, 11);
  await cards.first().focus();
  await expect(cards.first()).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(cards.first()).toHaveAttribute('tabindex', '0');
});

test('pointer hover, right click, cancellation and modified keys reveal nothing', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const first = page.locator('.card').first();
  await first.hover();
  await first.click({ button: 'right' });
  await page.keyboard.press('Escape');
  await first.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  await first.focus();
  for (const key of ['Control+Enter', 'Shift+Enter', 'Alt+Enter', 'Meta+Enter', 'Control+Space', 'Shift+ArrowRight']) {
    await page.keyboard.press(key);
  }
  await expect(first).toBeFocused();
  await expect(first).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card[data-face], .card svg circle, .card title')).toHaveCount(0);
  const hidden = await first.innerHTML();
  expect(hidden).not.toMatch(/cyan|solid|marker|face-id|data-face/i);
  await first.click();
  await expect(first).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
});

test('identical misses announce separately without clock, focus or timeout repeats', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await freezeTime(page);
  const live = page.locator('[aria-live="polite"][aria-atomic="true"]');
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await live.evaluate(element => {
    let updates = 0;
    new MutationObserver(() => element.setAttribute('data-observed-updates', String(++updates)))
      .observe(element, { subtree: true, childList: true, characterData: true });
  });
  await activate(page, 0);
  await activate(page, 1);
  await expect(live).toHaveText('No match. Cards close after a short pause.');
  await expect(live).toHaveAttribute('data-observed-updates', '1');
  await page.locator('.card').nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(800);
  await expect(live).toHaveAttribute('data-observed-updates', '1');
  await activate(page, 0);
  await activate(page, 1);
  await expect(live).toHaveAttribute('data-observed-updates', '2');
  await page.clock.runFor(1800);
  await expect(live).toHaveAttribute('data-observed-updates', '2');
});

import { test, expect } from '@playwright/test';
import { loadBoard } from './helpers.ts';

test('keeps one remembered tab stop and handles only unmodified row-and-column arrows', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  const cards = page.locator('.memory-card');
  await expect(cards).toHaveCount(16);
  await expect(page.locator('.memory-card[tabindex="0"]')).toHaveCount(1);
  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards.nth(0)).toBeFocused();
  await expect(page.locator('.memory-card[tabindex="0"]')).toHaveCount(1);

  await page.keyboard.press('Control+ArrowRight');
  await expect(cards.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await expect(page.locator('.memory-card[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(5)).toBeFocused();
});

test('leaves the face hidden for modifiers, hover, right click and pointer cancellation', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  const first = page.getByRole('button', { name: 'Row 1, column 1, closed' });
  await first.focus();
  await page.keyboard.press('Control+Enter');
  await expect(first).toHaveAttribute('aria-label', 'Row 1, column 1, closed');

  await first.hover();
  await first.click({ button: 'right' });
  await first.evaluate((element) => element.dispatchEvent(new PointerEvent('pointercancel', {
    bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
  })));
  await expect(first).toHaveAttribute('aria-label', 'Row 1, column 1, closed');
  await expect(page.locator('.game-summary')).toContainText('Moves: 0');
});

test('keeps hidden face IDs out of names, SVGs, DOM attributes and diagnostics', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-16-1');
  await expect(page.locator('.memory-card')).toHaveCount(256);
  const hidden = await page.locator('.memory-card').first().evaluate((card) => ({
    name: card.getAttribute('aria-label'),
    artwork: card.querySelector('.face-artwork'),
    attrs: Array.from(card.attributes, (attribute) => attribute.name),
  }));
  expect(hidden.name).toBe('Row 1, column 1, closed');
  expect(hidden.artwork).toBeNull();
  expect(hidden.attrs.some((name) => /face|identity|deck/i.test(name))).toBe(false);
  await expect(page.locator('.face-artwork')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(window).filter((key) => /deck|solver|faceId/i.test(key)))).toEqual([]);
});

test('announces each repeated miss once while focus and clock changes stay quiet', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  const live = page.locator('[aria-live="polite"][aria-atomic="true"]');
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);

  const startMiss = async () => {
    await page.getByRole('button', { name: /Row 1, column 1, .*closed/ }).click();
    await page.getByRole('button', { name: 'Row 1, column 2, closed' }).click();
    await expect(live).toHaveText('No match. Cards close after a short pause.');
  };
  await startMiss();
  const firstEvent = await live.locator('span').elementHandle();
  if (firstEvent === null) throw new Error('The first result announcement should render.');
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(800);
  expect(await firstEvent.evaluate((element) => element.isConnected)).toBe(true);

  await startMiss();
  const secondEvent = await live.locator('span').elementHandle();
  if (secondEvent === null) throw new Error('The repeated result announcement should render.');
  expect(await firstEvent.evaluate((element) => element.isConnected)).toBe(false);
  expect(await secondEvent.evaluate((element) => element.textContent)).toBe('No match. Cards close after a short pause.');
});

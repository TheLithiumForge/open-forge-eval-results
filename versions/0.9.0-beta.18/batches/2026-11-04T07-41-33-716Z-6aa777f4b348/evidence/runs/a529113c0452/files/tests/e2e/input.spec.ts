import { expect, test } from '@playwright/test';
import { cards, loadBoard, openGame, stat } from './support.ts';

test('roving focus follows arrows, edges, matched cards and native tab exit', async ({ page }) => {
  await openGame(page, true);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await loadBoard(page);
  await cards(page).nth(0).focus();
  for (const key of ['ArrowLeft', 'ArrowUp']) {
    await page.keyboard.press(key);
    await expect(cards(page).nth(0)).toBeFocused();
  }
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await cards(page).nth(11).focus();
  await page.keyboard.press('Space');
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await cards(page).nth(0).hover();
  await expect(cards(page).nth(0)).toHaveCSS('border-color', 'rgb(139, 234, 125)');
  await expect(cards(page).nth(0)).toHaveCSS('opacity', '1');
  await cards(page).nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(1)).toBeFocused();
  await expect(stat(page, 'Moves')).toHaveText('Moves: 1');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
});

test('hidden DOM contains neutral backs and no face identities', async ({ page }) => {
  await openGame(page);
  await loadBoard(page);
  await expect(page.locator('.card-face')).toHaveCount(0);
  const hidden = await cards(page).evaluateAll((elements) => elements.map((element) => element.outerHTML));
  expect(new Set(hidden.map((html) => html.replace(/Row \d+, column \d+/g, 'Position')
    .replace(/tabindex="-?\d"/g, 'tabindex="0"'))).size).toBe(1);
  expect(hidden.join('')).not.toMatch(/data-face|cyan|magenta|marker|solid|outline/);
  await cards(page).nth(0).click();
  await expect(page.locator('.card-face')).toHaveCount(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName('Row 1, column 2, closed');
});

test('hover, secondary click and pointer cancellation do not reveal', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => document.addEventListener('contextmenu', (event) => {
    document.documentElement.dataset.contextPrevented = String(event.defaultPrevented);
  }));
  await cards(page).nth(0).hover();
  await expect(cards(page).nth(0)).toHaveCSS('border-color', 'rgb(244, 246, 255)');
  await cards(page).nth(0).click({ button: 'right' });
  expect(await page.locator('html').getAttribute('data-context-prevented')).toBe('false');
  await page.keyboard.press('Escape');
  await cards(page).nth(0).dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch', isPrimary: true });
  await cards(page).nth(0).dispatchEvent('pointercancel', { pointerId: 9, pointerType: 'touch', isPrimary: true });
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await expect(stat(page, 'Moves')).toHaveText('Moves: 0');
});

test.describe('touch input', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 800 } });
  test('completed taps use the shared card action', async ({ page }) => {
    await openGame(page);
    await loadBoard(page);
    await cards(page).nth(0).tap();
    await cards(page).nth(11).tap();
    await expect(stat(page, 'Moves')).toHaveText('Moves: 1');
    await expect(stat(page, 'Pairs')).toHaveText('Pairs: 1/8');
  });
});

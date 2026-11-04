import { expect, test } from '@playwright/test';
import { cards, loadBoard } from './helpers.ts';

test('native controls, remembered Tab stop, arrows, edges and session focus', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await expect(page.getByLabel('Grid size')).toHaveJSProperty('tagName', 'SELECT');
  await expect(page.getByLabel('Grid size').locator('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await loadBoard(page);
  await expect(cards(page).first()).toHaveJSProperty('tagName', 'BUTTON');
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(11)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(11)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await expect(cards(page).nth(11)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveAccessibleName('Row 1, column 1, closed');
});

test('closed DOM is anonymous; hover, cancel and context menu leave play unchanged', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const closed = await cards(page).evaluateAll(buttons => buttons.map(button => button.outerHTML));
  for (const markup of closed) {
    expect(markup).not.toMatch(/card-face|faceId|data-face|cyan|solid|outline circle/);
  }
  const back = await cards(page).nth(0).locator('svg').innerHTML();
  for (const button of await cards(page).all()) expect(await button.locator('svg').innerHTML()).toBe(back);
  await cards(page).nth(0).hover();
  await cards(page).nth(0).dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  await cards(page).nth(0).dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  const menu = page.evaluate(() => new Promise<boolean>(resolve => {
    document.addEventListener('contextmenu', event => resolve(event.defaultPrevented), { once: true });
  }));
  await cards(page).nth(0).click({ button: 'right' });
  expect(await menu).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('.card-revealed')).toHaveCount(0);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

test('completed touch taps use the same reveal and match action', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await loadBoard(page);
  await cards(page).nth(0).tap();
  await cards(page).nth(11).tap();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await context.close();
});

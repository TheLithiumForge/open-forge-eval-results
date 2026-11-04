import { expect, test } from '@playwright/test';
import { cards, frozenPage, loadBoard } from './support.ts';

test('keeps closed identities private and uses native pointer and keyboard activation', async ({ page }) => {
  await frozenPage(page);
  await loadBoard(page);
  const closed = await cards(page).evaluateAll((nodes) => nodes.map((node) => node.outerHTML));
  expect(new Set(closed.map((html) => html.replace(/data-position="\d+"|tabindex="-?\d+"|aria-label="[^"]+"/g, ''))).size).toBe(1);
  expect(closed.join('')).not.toMatch(/card-face|data-face|cyan|magenta|marker top/);
  const source = await cards(page).first().innerHTML();
  await cards(page).first().hover();
  await cards(page).first().dispatchEvent('pointercancel', { pointerId: 1 });
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  expect(await cards(page).first().innerHTML()).toBe(source);
  let contextPrevented = true;
  page.on('console', (message) => {
    if (message.text().startsWith('CONTEXT_PREVENTED:')) contextPrevented = message.text().endsWith('true');
  });
  await page.evaluate(() => document.addEventListener('contextmenu', (event) => {
    console.info(`CONTEXT_PREVENTED:${event.defaultPrevented}`);
  }));
  await cards(page).first().click({ button: 'right' });
  await expect.poll(() => contextPrevented).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await cards(page).first().click();
  await expect(cards(page).first()).toHaveAccessibleName(/cyan solid plus, marker top, revealed$/);
  await cards(page).nth(11).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.card--matched')).toHaveCount(2);
  await expect(cards(page).first()).toHaveAttribute('aria-disabled', 'true');
  await cards(page).first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(1)).toBeFocused();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
});

test('leaves modifier combinations outside game activation and navigation', async ({ page }) => {
  await frozenPage(page);
  await loadBoard(page);
  await cards(page).nth(5).focus();
  for (const modifier of ['Shift', 'Control', 'Alt', 'Meta']) {
    await page.keyboard.press(`${modifier}+ArrowRight`);
    await expect(cards(page).nth(5)).toBeFocused();
    await page.keyboard.press(`${modifier}+Enter`);
    await page.keyboard.press(`${modifier}+Space`);
    await expect(page.locator('.card--revealed')).toHaveCount(0);
  }
});

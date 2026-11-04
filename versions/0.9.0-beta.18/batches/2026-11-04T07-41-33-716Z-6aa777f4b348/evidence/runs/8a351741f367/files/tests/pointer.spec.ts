import { expect, test } from '@playwright/test';
import { card, loadBoard } from './gameActions.ts';

test('closed cards expose no identity and hover, right-click and cancellation never reveal', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const backs = await page.locator('.card').evaluateAll((elements) => elements.map((element) => ({
    html: element.innerHTML, attributes: [...element.attributes].map((attribute) => [attribute.name, attribute.value]),
  })));
  expect(new Set(backs.map((back) => back.html)).size).toBe(1);
  for (const back of backs) {
    expect(JSON.stringify(back.attributes)).not.toMatch(/cyan|magenta|face|marker|seed|np1/i);
    expect(back.html).not.toMatch(/circle|polygon|rect|data-/);
  }
  await card(page, 0).hover();
  await card(page, 0).click({ button: 'right' });
  await page.keyboard.press('Escape');
  await card(page, 0).dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await card(page, 0).dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await card(page, 0).click();
  await expect(page.locator('.card--revealed')).toHaveCount(1);
});

test('completed touchscreen taps share the same game activation', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await loadBoard(page);
    await card(page, 0).tap();
    await card(page, 11).tap();
    await expect(page.locator('.game-status')).toContainText('Moves: 1');
    await expect(page.locator('.card--matched')).toHaveCount(2);
  } finally { await context.close(); }
});

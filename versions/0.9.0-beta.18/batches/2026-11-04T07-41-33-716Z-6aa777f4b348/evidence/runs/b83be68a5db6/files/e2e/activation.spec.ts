import { expect, test } from '@playwright/test';
import { exported, loadBoard } from './helpers.ts';

test('hover, context menu and pointer cancellation preserve the game', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const card = page.locator('.card').first();
  await card.hover();
  await card.click({ button: 'right' });
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  const prevented = await card.evaluate(button => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    button.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await page.keyboard.press('Escape');
  await card.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await card.dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect((await exported(page)).started).toBe(false);
  await card.click();
  await expect(card).toHaveAccessibleName(/revealed$/);
  await expect(page.locator('.status')).toContainText('Moves: 0');
});

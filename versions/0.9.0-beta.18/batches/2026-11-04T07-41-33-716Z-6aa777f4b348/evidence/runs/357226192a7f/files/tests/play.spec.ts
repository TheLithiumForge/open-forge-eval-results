import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/deal.ts';
import { cards, finish, freezeClock, loadBoard } from './helpers.ts';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('turns, exact mismatch duration, ignored actions and restart invalidation', async ({ page }) => {
  await freezeClock(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await cards(page).nth(0).click({ force: true });
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click({ force: true });
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(4);
  await page.clock.runFor(799);
  await expect(page.locator('.card.revealed')).toHaveCount(4);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await cards(page).nth(3).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(3)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await cards(page).nth(0).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
});

for (const size of SIZES) {
  test('completes a ' + size + 'x' + size + ' deal', async ({ page }) => {
    test.setTimeout(300000);
    const code = 'np1-' + size + '-1';
    await loadBoard(page, code);
    await finish(page, code, [], size === 4 ? 'pointer' : 'keyboard');
    await expect(page.getByText('Moves: ' + size ** 2 / 2, { exact: true })).toBeVisible();
    await expect(page.getByText('Pairs: ' + size ** 2 / 2 + '/' + size ** 2 / 2, { exact: true })).toBeVisible();
    await expect(page.locator('.card.matched')).toHaveCount(size ** 2);
    await expect(page.locator('.card.matched').first()).toHaveAttribute('aria-disabled', 'true');
  });
}

test('hidden identity, native context menu, cancellation and modifier keys', async ({ page }) => {
  await loadBoard(page);
  const first = cards(page).first();
  await expect(first).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(page.locator('.board-grid svg')).toHaveCount(0);
  expect(await first.evaluate(element => element.outerHTML)).not.toMatch(/data-face|cyan|rose|plus|marker|face-id/);
  await first.hover();
  await first.click({ button: 'right' });
  await page.keyboard.press('Escape');
  await first.dispatchEvent('pointercancel');
  await expect(first).toHaveAccessibleName(/closed$/);
  await first.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(first).toBeFocused();
  await page.keyboard.press('Control+Enter');
  await page.keyboard.press('Shift+Space');
  await expect(first).toHaveAccessibleName(/closed$/);
  await page.keyboard.press('Enter');
  await expect(first).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
});

test('page visibility pauses both clocks without charging hidden time', async ({ page }) => {
  await freezeClock(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.clock.runFor(200);
  await expect(page.getByText('Time: 0:01', { exact: true })).toBeVisible();
});

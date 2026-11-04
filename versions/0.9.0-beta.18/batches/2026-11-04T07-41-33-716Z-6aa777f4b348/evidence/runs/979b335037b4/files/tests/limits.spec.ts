import { expect, test } from '@playwright/test';
import { cards, exportedState, freezeClock, loadBoard, loadSnapshot, sampleSnapshot } from './helpers.ts';

test('counter caps preserve playable turns and the exact remaining mismatch millisecond', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadSnapshot(page, sampleSnapshot({ moves: 999999, elapsedMs: 359999999 }));
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(299);
  const pending = await exportedState(page);
  expect(pending.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  expect(pending.moves).toBe(999999);
  expect(pending.elapsedMs).toBe(359999999);
  await expect(page.locator('.status-strip')).toContainText('Time: 5999:59');
  await page.clock.runFor(1);
  await cards(page).nth(1).click();
  await cards(page).nth(9).click();
  await expect(page.locator('.status-strip')).toContainText('Moves: 999999');
  await expect(page.locator('.status-strip')).toContainText('Pairs: 2/8');
  await loadSnapshot(page, sampleSnapshot({ moves: 999999, elapsedMs: 359999999,
    matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 8 && i !== 15),
    selection: { kind: 'closed' } }));
  await page.getByRole('button', { name: 'Resume' }).click();
  await cards(page).nth(8).click();
  await cards(page).nth(15).click();
  await expect(page.locator('.win-banner')).toContainText('999999 moves · 5999:59');
  await expect(page.locator('.status-strip')).toContainText('Best: 999999');
});

test('successful load, restart and size changes reset the remembered board entry', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(10).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await cards(page).nth(10).click();
  await loadSnapshot(page);
  expect(await cards(page).first().getAttribute('tabindex')).toBe('0');
  expect(await cards(page).nth(10).getAttribute('tabindex')).toBe('-1');
  await page.getByLabel('Grid size').focus();
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByLabel('Grid size')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
});

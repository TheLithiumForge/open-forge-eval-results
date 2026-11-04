import { expect, test } from '@playwright/test';
import { card, exported, frozenClock, observeAnnouncements, openBoard } from './helpers.ts';

test('native keyboard entry, arrow edges, remembered tab stop and native exit', async ({ page }) => {
  await openBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(card(page, 0)).toBeFocused();
  for (let column = 0; column < 4; column++) await page.keyboard.press('ArrowRight');
  await expect(card(page, 3)).toBeFocused();
  for (let row = 0; row < 4; row++) await page.keyboard.press('ArrowDown');
  await expect(card(page, 15)).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(card(page, 15)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  expect((await exported(page)).started).toBe(false);
});

test('hover, right-click and pointer cancellation keep cards closed and private', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('.card svg')).toHaveCount(0);
  const attributes = await page.locator('.card-closed').evaluateAll((elements) => elements.map((element) => ({
    names: element.getAttributeNames(), name: element.getAttribute('aria-label'), text: element.textContent,
  })));
  for (const entry of attributes) {
    expect(entry.names.every((name) => ['type', 'class', 'aria-label', 'aria-disabled', 'tabindex'].includes(name))).toBe(true);
    expect(entry.name).toMatch(/^Row \d+, column \d+, closed$/);
    expect(entry.text).toBe('');
  }
  await card(page, 0).hover();
  await card(page, 0).click({ button: 'right' });
  await card(page, 1).dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await card(page, 1).dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  expect((await exported(page)).started).toBe(false);
  await card(page, 0).click();
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await expect(page.locator('.card svg')).toHaveCount(1);
});

test('identical consecutive misses announce separately; clock, closing and focus never repeat', async ({ page }) => {
  await frozenClock(page);
  await openBoard(page);
  const events = await observeAnnouncements(page);
  for (let turn = 0; turn < 2; turn++) {
    await card(page, 0).click();
    await card(page, 1).click();
    await expect.poll(() => events.length).toBe(turn + 1);
    await page.clock.runFor(800);
    await card(page, 5).focus();
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(1000);
    expect(events.length).toBe(turn + 1);
  }
  expect(events).toEqual(['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.']);
  await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
});

test('completed touch taps use the same reveal and match action', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', hasTouch: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  try {
    await openBoard(page);
    await card(page, 0).tap();
    await card(page, 11).tap();
    await expect(page.locator('.game-status')).toContainText('Pairs: 1/8');
    await expect(page.locator('.game-status')).toContainText('Moves: 1');
  } finally { await context.close(); }
});

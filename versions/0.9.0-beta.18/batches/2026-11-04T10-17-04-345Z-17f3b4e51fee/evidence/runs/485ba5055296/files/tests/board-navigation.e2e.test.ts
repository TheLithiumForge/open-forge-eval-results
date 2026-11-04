import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('arrow movement remembers one tab stop and stops at interior row edges', async ({ page }) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(4).click();
  for (const [key, index] of [
    ['ArrowLeft', 4],
    ['ArrowRight', 5],
    ['ArrowDown', 9],
    ['ArrowLeft', 8],
    ['ArrowUp', 4],
  ] as const) {
    await page.keyboard.press(key);
    await expect(cards.nth(index)).toBeFocused();
    await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
    await expect(cards.nth(index)).toHaveAttribute('tabindex', '0');
  }
  await cards.nth(7).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(7)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(7)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards.nth(7)).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

test('matched cards and a pending mismatch allow movement without changing the turn', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  for (const index of [2, 6, 0, 1]) await cards.nth(index).click();
  const before = await exportedSnapshot(page);
  await cards.nth(1).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(6)).toBeFocused();
  await expect(cards.nth(6)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(10)).toBeFocused();
  expect(await exportedSnapshot(page)).toEqual(before);
});

test('modified arrows and unrelated keys remain unhandled by the board', async ({ page }) => {
  await loadTimedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const prevented = await card.evaluate((element) => {
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const modifiers = [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }];
    const keys = [
      ...modifiers.flatMap((modifier) => arrows.map((key) => ({ key, ...modifier }))),
      ...['Home', 'End', 'PageUp', 'PageDown', 'a', 'h'].map((key) => ({ key })),
    ];
    return keys.map((options) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  expect(prevented.every((value) => !value)).toBe(true);
  await expect(card).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

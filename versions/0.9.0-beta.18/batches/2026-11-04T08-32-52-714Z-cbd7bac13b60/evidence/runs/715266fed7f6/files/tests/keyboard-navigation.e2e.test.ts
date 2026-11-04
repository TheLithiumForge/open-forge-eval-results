import { expect, Scrollbars, test, TestTimeouts } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test(
  'arrow movement follows each board size, stops at edges and remembers one native tab stop',
  async ({ page }) => {
    await loadTimedBoard(page);
    const cards = page.locator('.card');
    for (const size of [4, 6, 8, 10, 12, 14, 16]) {
      await page.getByLabel('Grid size', { exact: true }).selectOption(String(size));
      const before = await exportedSnapshot(page);
      await page.getByRole('button', { name: 'Restart', exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(cards.first()).toBeFocused();
      await cards.nth(size + 1).focus();
      for (const [key, index] of [
        ['ArrowLeft', size],
        ['ArrowLeft', size],
        ['ArrowRight', size + 1],
        ['ArrowUp', 1],
        ['ArrowUp', 1],
        ['ArrowDown', size + 1],
      ] as const) {
        await page.keyboard.press(key);
        await expect(cards.nth(index)).toBeFocused();
        await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
        await expect(cards.nth(index)).toHaveAttribute('tabindex', '0');
      }
      await cards.nth(size * size - 1).focus();
      for (const key of ['ArrowRight', 'ArrowDown']) {
        await page.keyboard.press(key);
        await expect(cards.last()).toBeFocused();
      }
      await page.keyboard.press('Tab');
      await expect(page.locator('summary')).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(cards.last()).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
      expect(await exportedSnapshot(page)).toEqual(before);
    }
  },
  {},
  Scrollbars.hidden,
  TestTimeouts.long,
);

test('keyboard focus crosses matched cards and a mismatch without changing blocked play', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(2).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  const before = await exportedSnapshot(page);
  await cards.nth(1).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(800);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card.matched')).toHaveCount(2);
});

test('other keys and modified arrows stay unhandled and do not move board focus', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const before = await exportedSnapshot(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const prevented = await card.evaluate((button) => {
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const modifiers = [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }];
    const keys: KeyboardEventInit[] = [
      ...['Home', 'End', 'PageUp', 'PageDown', 'a', 'Escape'].map((key) => ({ key })),
      ...modifiers.flatMap((modifier) => arrows.map((key) => ({ key, ...modifier }))),
    ];
    return keys.map((key) => {
      const event = new KeyboardEvent('keydown', { ...key, bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  expect(prevented.every((value) => !value)).toBe(true);
  await expect(card).toBeFocused();
  expect(await exportedSnapshot(page)).toEqual(before);
});

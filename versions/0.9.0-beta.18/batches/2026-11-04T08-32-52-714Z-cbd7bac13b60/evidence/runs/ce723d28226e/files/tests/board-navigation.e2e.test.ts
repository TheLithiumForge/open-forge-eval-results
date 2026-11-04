import { expect, test, TestTimeouts } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test(
  'arrow movement follows rows and columns at every size without changing play',
  async ({ page }) => {
    await loadTimedBoard(page);
    for (const size of [4, 6, 8, 10, 12, 14, 16]) {
      await page.getByLabel('Grid size', { exact: true }).selectOption(String(size));
      const cards = page.locator('.card');
      await expect(cards).toHaveCount(size * size);
      const before = await exportedSnapshot(page);
      await cards.nth(size + 1).focus();
      for (const [key, destination] of [
        ['ArrowLeft', size],
        ['ArrowLeft', size],
        ['ArrowRight', size + 1],
        ['ArrowUp', 1],
        ['ArrowUp', 1],
        ['ArrowDown', size + 1],
      ] as const) {
        await page.keyboard.press(key);
        await expect(cards.nth(destination)).toBeFocused();
        await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
        await expect(cards.nth(destination)).toHaveAttribute('tabindex', '0');
      }
      await cards.nth(2 * size - 1).focus();
      await page.keyboard.press('ArrowRight');
      await expect(cards.nth(2 * size - 1)).toBeFocused();
      await cards.nth(size * size - 2).focus();
      await page.keyboard.press('ArrowDown');
      await expect(cards.nth(size * size - 2)).toBeFocused();
      await cards.first().focus();
      const edgeDefaults = await cards.first().evaluate((element) =>
        ['ArrowLeft', 'ArrowUp'].map((key) => {
          const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        }),
      );
      expect(edgeDefaults).toEqual([true, true]);
      expect(await exportedSnapshot(page)).toEqual(before);
    }
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('modified arrows and other keys stay with the browser', async ({ page }) => {
  await loadTimedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  for (const modifier of ['Alt', 'Control', 'Meta', 'Shift'])
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(card).toBeFocused();
    }
  for (const key of ['Home', 'End', 'PageUp', 'PageDown', 'a', 'Escape']) {
    await page.keyboard.press(key);
    await expect(card).toBeFocused();
  }
  const prevented = await card.evaluate((element) => {
    const keys = ['Home', 'End', 'PageUp', 'PageDown', 'a', 'Escape', 'Tab'];
    const events = keys.map(
      (key) => new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
        events.push(
          new KeyboardEvent('keydown', { key, [modifier]: true, bubbles: true, cancelable: true }),
        );
    return events.map((event) => {
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  expect(prevented).toEqual(prevented.map(() => false));
  expect(await exportedSnapshot(page)).toMatchObject({ moves: 0, elapsedMs: 0, started: false });
});

test('matched cards and a pending mismatch allow movement while ignoring activation', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(2).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards.nth(6)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(2)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  const before = await exportedSnapshot(page);
  expect(before).toMatchObject({ moves: 2, matched: [2, 6], selection: { kind: 'mismatch' } });
  await cards.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(4)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await cards.nth(4).click();
  expect(await exportedSnapshot(page)).toEqual(before);
});

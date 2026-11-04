import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadFixedBoard } from './game-fixture.ts';

for (const size of [4, 6, 16])
  test(`arrow navigation follows a ${size}x${size} board without changing play`, async ({
    page,
  }) => {
    await loadFixedBoard(page);
    await page.getByLabel(DealControl.size, { exact: true }).selectOption(String(size));
    const cards = page.locator('.card');
    const status = await page.getByRole('status').textContent();
    await cards.nth(size + 1).focus();
    for (const [key, destination] of [
      ['ArrowRight', size + 2],
      ['ArrowDown', 2 * size + 2],
      ['ArrowLeft', 2 * size + 1],
      ['ArrowUp', size + 1],
    ] as const) {
      await page.keyboard.press(key);
      await expect(cards.nth(destination)).toBeFocused();
      await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
      await expect(cards.nth(destination)).toHaveAttribute('tabindex', '0');
    }
    for (const [index, key] of [
      [size, 'ArrowLeft'],
      [2 * size - 1, 'ArrowRight'],
      [1, 'ArrowUp'],
      [size ** 2 - 2, 'ArrowDown'],
    ] as const) {
      await cards.nth(index).focus();
      await page.keyboard.press(key);
      await expect(cards.nth(index)).toBeFocused();
    }
    await expect(page.getByRole('status')).toHaveText(status ?? '');
    expect(await exportedSnapshot(page)).toMatchObject({
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    });
  });

test('modified arrows and other keys stay native, and Tab returns to the remembered card', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const defaults = await card.evaluate((element) => {
    const events: KeyboardEventInit[] = ['Home', 'End', 'PageUp', 'PageDown', 'Escape'].map(
      (key) => ({ key }),
    );
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
        events.push({ key, [modifier]: true });
    return events.map((event) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', { ...event, bubbles: true, cancelable: true }),
      ),
    );
  });
  expect(defaults.every(Boolean)).toBe(true);
  await expect(card).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(card).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: DealControl.restart, exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(card).toBeFocused();
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

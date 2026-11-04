import { expect, test } from './browser-test.ts';
import { GRID_SIZES } from '../src/game/deck.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { loadFixedBoard, moves } from './game-fixture.ts';

test('arrows move one row or column and stop at every edge for each board size', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  for (const size of GRID_SIZES) {
    await page.getByLabel(DealControl.size, { exact: true }).selectOption(String(size));
    for (const [from, key, to] of [
      [size + 1, 'ArrowLeft', size],
      [size + 1, 'ArrowRight', size + 2],
      [size + 1, 'ArrowUp', 1],
      [size + 1, 'ArrowDown', 2 * size + 1],
      [size, 'ArrowLeft', size],
      [2 * size - 1, 'ArrowRight', 2 * size - 1],
      [1, 'ArrowUp', 1],
      [size * (size - 1) + 1, 'ArrowDown', size * (size - 1) + 1],
    ] as const) {
      await cards.nth(from).focus();
      await page.keyboard.press(key);
      await expect(cards.nth(to)).toBeFocused();
      await expect(cards.nth(to)).toHaveAttribute('tabindex', '0');
      await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
    }
    await expect(page.locator('.card.revealed')).toHaveCount(0);
    expect(await moves(page)).toBe(0);
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(cards.nth(size * (size - 1) + 1)).toBeFocused();
  }
});

test('the board consumes arrows even at edges and leaves other keys to the browser', async ({
  page,
}) => {
  await loadFixedBoard(page);
  await page.evaluate(() => {
    document.addEventListener('keydown', (event) => {
      document.body.dataset.keyPrevented = String(event.defaultPrevented);
    });
  });
  const first = page.locator('.card').first();
  await first.focus();
  for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
    await page.keyboard.press(key);
    await expect(page.locator('body')).toHaveAttribute('data-key-prevented', 'true');
  }
  const remembered = page.locator('.card').nth(5);
  await expect(remembered).toBeFocused();
  for (const key of ['Home', 'End', 'PageUp', 'PageDown', 'a']) {
    await page.keyboard.press(key);
    await expect(page.locator('body')).toHaveAttribute('data-key-prevented', 'false');
    await expect(remembered).toBeFocused();
  }
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await moves(page)).toBe(0);
});

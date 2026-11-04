import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { loadFixedBoard, loadTimedBoard, moves } from './game-fixture.ts';

for (const size of [4, 6, 8, 10, 12, 14, 16])
  test(`arrow keys move one card and stop at every edge on ${size}x${size}`, async ({ page }) => {
    await loadFixedBoard(page);
    await page.getByLabel(DealControl.size, { exact: true }).selectOption(String(size));
    const cards = page.locator('.card');
    const lastRow = size * (size - 1);
    for (const [from, key, to] of [
      [size + 1, 'ArrowLeft', size],
      [size + 1, 'ArrowRight', size + 2],
      [size + 1, 'ArrowUp', 1],
      [size + 1, 'ArrowDown', 2 * size + 1],
      [size, 'ArrowLeft', size],
      [2 * size - 1, 'ArrowRight', 2 * size - 1],
      [1, 'ArrowUp', 1],
      [lastRow + 1, 'ArrowDown', lastRow + 1],
    ] as const) {
      await cards.nth(from).focus();
      await page.keyboard.press(key);
      await expect(cards.nth(to), `I06/I07 ${key} from ${from}`).toBeFocused();
      await expect(cards.nth(to)).toHaveAttribute('tabindex', '0');
      await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
    }
    await expect(page.locator('.card.closed')).toHaveCount(size ** 2);
    expect(await moves(page)).toBe(0);
    await expect(page.locator('.stats dd').nth(2)).toHaveText('0:00');
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(cards.nth(lastRow + 1)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      page.getByRole('button', { name: DealControl.restart, exact: true }),
    ).toBeFocused();
  });

test('arrow navigation stays available during a mismatch without accepting another reveal', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.first().focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await expect(cards.nth(5)).toHaveClass('card closed');
  expect(await moves(page)).toBe(1);
  await page.clock.runFor(800);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards.nth(5)).toHaveClass('card revealed');
  expect(await moves(page)).toBe(1);
});

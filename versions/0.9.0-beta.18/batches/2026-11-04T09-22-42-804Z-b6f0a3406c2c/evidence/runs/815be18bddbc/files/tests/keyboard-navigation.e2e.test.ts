import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { GRID_SIZES } from '../src/game/deck.ts';
import { exportedSnapshot, loadTimedBoard, moves } from './game-fixture.ts';

for (const size of GRID_SIZES)
  test(`arrow keys move by row and column and stop at every edge on a ${size}x${size} board`, async ({
    page,
  }) => {
    await loadTimedBoard(page);
    await page.getByLabel(DealControl.size, { exact: true }).selectOption(String(size));
    const before = await exportedSnapshot(page);
    const cards = page.locator('.card');
    await cards.first().focus();
    for (const [key, destination] of [
      ['ArrowRight', 1],
      ['ArrowDown', size + 1],
      ['ArrowLeft', size],
      ['ArrowUp', 0],
    ] as const) {
      await page.keyboard.press(key);
      await expect(cards.nth(destination)).toBeFocused();
      await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
      await expect(cards.nth(destination)).toHaveAttribute('tabindex', '0');
    }
    for (const [index, key] of [
      [size, 'ArrowLeft'],
      [size - 1, 'ArrowRight'],
      [1, 'ArrowUp'],
      [size ** 2 - 2, 'ArrowDown'],
    ] as const) {
      await cards.nth(index).focus();
      await page.keyboard.press(key);
      await expect(cards.nth(index)).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(cards.nth(size ** 2 - 2)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      page.getByRole('button', { name: DealControl.restart, exact: true }),
    ).toBeFocused();
    expect(await exportedSnapshot(page)).toEqual(before);
  });

test('arrow movement crosses matched cards and continues during a mismatch without activating cards', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(11).click();
  await cards.nth(10).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(11)).toBeFocused();
  await expect(cards.nth(11)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  expect(await moves(page)).toBe(1);
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(15)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await expect(cards.nth(14)).toBeFocused();
  await page.keyboard.press('Space');
  const before = await exportedSnapshot(page);
  expect(before.selection).toEqual({ kind: 'mismatch', first: 15, second: 14, remainingMs: 800 });
  await cards.nth(14).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.nth(13)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(9)).toBeFocused();
  await page.keyboard.press('Space');
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(800);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await cards.nth(9).focus();
  await page.keyboard.press('Space');
  await expect(cards.nth(9)).toHaveClass(/revealed/);
  expect(await moves(page)).toBe(2);
});

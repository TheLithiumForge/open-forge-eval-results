import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { GRID_SIZES } from '../src/game/deck.ts';
import { loadFixedBoard, loadTimedBoard, moves } from './game-fixture.ts';

test('hidden DOM contains only position state and identical neutral backs', async ({ page }) => {
  await loadFixedBoard(page);
  const cards = await page.locator('.card').evaluateAll((elements) =>
    elements.map((element) => ({
      attributes: Object.fromEntries([...element.attributes].map((a) => [a.name, a.value])),
      content: element.innerHTML,
      text: element.textContent,
    })),
  );
  for (const [index, card] of cards.entries())
    expect(card).toEqual({
      attributes: {
        type: 'button',
        class: 'card closed',
        'aria-label': `Row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}, closed`,
        'aria-disabled': 'false',
        tabindex: index === 0 ? '0' : '-1',
      },
      content: '<span class="card-back" aria-hidden="true"></span>',
      text: '',
    });
});

test('arrow keys move by row and column without wrapping or revealing cards at every size', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  for (const size of GRID_SIZES) {
    await page.getByLabel(DealControl.size, { exact: true }).selectOption(String(size));
    await cards.nth(size + 1).focus();
    for (const [key, index] of [
      ['ArrowRight', size + 2],
      ['ArrowDown', 2 * size + 2],
      ['ArrowLeft', 2 * size + 1],
      ['ArrowUp', size + 1],
    ] as const) {
      await page.keyboard.press(key);
      await expect(cards.nth(index)).toBeFocused();
      await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
      await expect(cards.nth(index)).toHaveAttribute('tabindex', '0');
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('.card:focus')).toHaveCount(0);
    await page.keyboard.press('Shift+Tab');
    await expect(cards.nth(size + 1)).toBeFocused();
    for (const [index, keys] of [
      [0, ['ArrowLeft', 'ArrowUp']],
      [size - 1, ['ArrowRight', 'ArrowUp']],
      [size * (size - 1), ['ArrowLeft', 'ArrowDown']],
      [size * size - 1, ['ArrowRight', 'ArrowDown']],
    ] as const) {
      await cards.nth(index).focus();
      for (const key of keys) {
        await page.keyboard.press(key);
        await expect(cards.nth(index)).toBeFocused();
      }
    }
    await expect(page.locator('.card.closed')).toHaveCount(size * size);
    expect(await moves(page)).toBe(0);
  }
});

test('modified arrows and other navigation keys stay available to the browser', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const untouched = await card.evaluate((element) => {
    const results: boolean[] = [];
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
        results.push(
          element.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              [modifier]: true,
              bubbles: true,
              cancelable: true,
            }),
          ),
        );
    for (const key of ['Home', 'End', 'PageUp', 'PageDown', 'Escape', 'a'])
      results.push(
        element.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        ),
      );
    return results.every(Boolean);
  });
  expect(untouched).toBe(true);
  await expect(card).toBeFocused();
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await moves(page)).toBe(0);
});

test('arrow movement continues during a mismatch while activation waits for the timeout', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards.nth(2)).toHaveClass(/closed/);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(1);
  await page.clock.runFor(800);
  await page.keyboard.press('Space');
  await expect(cards.nth(2)).toHaveClass(/revealed/);
  expect(await moves(page)).toBe(1);
});

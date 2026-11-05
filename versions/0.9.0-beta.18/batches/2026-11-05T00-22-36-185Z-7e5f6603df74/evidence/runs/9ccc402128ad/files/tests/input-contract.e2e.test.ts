import { expect, test } from './browser-test.ts';
import { loadFixedBoard } from './game-fixture.ts';
import { moves } from './game-fixture.ts';

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

test('arrow navigation remembers one tab stop and leaves modified keys to the browser', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(5).focus();
  for (const [key, index] of [
    ['ArrowRight', 6],
    ['ArrowDown', 10],
    ['ArrowLeft', 9],
    ['ArrowUp', 5],
  ] as const) {
    await page.keyboard.press(key);
    await expect(cards.nth(index)).toBeFocused();
  }
  for (const modifier of ['Alt', 'Control', 'Meta', 'Shift']) {
    const prevented = await cards.nth(5).evaluate((card, name) => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
        altKey: name === 'Alt',
        ctrlKey: name === 'Control',
        metaKey: name === 'Meta',
        shiftKey: name === 'Shift',
      });
      card.dispatchEvent(event);
      return event.defaultPrevented;
    }, modifier);
    expect(prevented).toBe(false);
    await expect(cards.nth(5)).toBeFocused();
  }
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(cards.nth(5)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await moves(page)).toBe(0);
  await page.keyboard.press('Tab');
  await expect(cards.nth(5)).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards.nth(5)).toHaveClass(/revealed/);
});

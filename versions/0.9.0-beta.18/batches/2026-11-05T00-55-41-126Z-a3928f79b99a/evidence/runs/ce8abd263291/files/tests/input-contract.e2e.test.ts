import { expect, test } from './browser-test.ts';
import { loadFixedBoard } from './game-fixture.ts';

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

test('arrow movement remembers focus, stops at row edges and leaves modified keys to the browser', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(3).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(3)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(7)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(2)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);

  const modified = await cards.nth(2).evaluate((card) => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    return card.dispatchEvent(event);
  });
  expect(modified).toBe(true);
  await expect(cards.nth(2)).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(cards.nth(2)).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(2)).toBeFocused();
});

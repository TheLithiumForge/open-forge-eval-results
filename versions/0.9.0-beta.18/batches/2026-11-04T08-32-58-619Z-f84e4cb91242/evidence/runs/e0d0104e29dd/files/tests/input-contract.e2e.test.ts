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

test('modified keyboard input keeps browser defaults without moving or revealing cards', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  for (const key of ['Shift+ArrowRight', 'Shift+Enter', 'Shift+Space', 'Control+Space']) {
    await page.keyboard.press(key);
    await expect(card).toBeFocused();
    await expect(page.locator('.card.closed')).toHaveCount(16);
  }
  const prevented = await card.evaluate((button) => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
});

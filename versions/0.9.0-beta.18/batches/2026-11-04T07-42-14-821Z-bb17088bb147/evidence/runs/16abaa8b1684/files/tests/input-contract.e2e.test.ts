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

test('modified arrows and other keys keep board focus and browser defaults', async ({ page }) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
    const modifiers = key.startsWith('Arrow')
      ? [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]
      : [{}];
    for (const modifier of modifiers) {
      const prevented = await card.evaluate(
        (element, init) => {
          const event = new KeyboardEvent('keydown', {
            ...init,
            bubbles: true,
            cancelable: true,
          });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        },
        { key, ...modifier },
      );
      expect(prevented, `${key} with ${JSON.stringify(modifier)} stays with the browser`).toBe(
        false,
      );
      await expect(card).toBeFocused();
    }
  }
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(card).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
});

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

test('board navigation leaves other keys and modified arrows with the browser', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const canceled = await card.evaluate((element) => {
    const keys: KeyboardEventInit[] = [
      ...['Home', 'End', 'PageUp', 'PageDown', 'Escape', 'Tab', 'Enter', ' '].map((key) => ({
        key,
      })),
      ...['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].flatMap((key) => [
        { key, altKey: true },
        { key, ctrlKey: true },
        { key, metaKey: true },
        { key, shiftKey: true },
      ]),
    ];
    return keys.filter(
      (options) =>
        !element.dispatchEvent(
          new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }),
        ),
    );
  });
  expect(canceled).toEqual([]);
  await expect(card).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

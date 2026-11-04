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

test('modified keys stay with the browser without moving focus or revealing a card', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  for (const modifier of ['Alt', 'Control', 'Meta', 'Shift'])
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Space']) {
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(card).toBeFocused();
      await expect(page.locator('.card.revealed')).toHaveCount(0);
    }
  const browserDefaults = await card.evaluate((element) => {
    const allowed: boolean[] = [];
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ']) {
        const event = new KeyboardEvent('keydown', {
          key,
          [modifier]: true,
          bubbles: true,
          cancelable: true,
        });
        allowed.push(element.dispatchEvent(event));
      }
    return allowed;
  });
  expect(browserDefaults.every(Boolean)).toBe(true);
});

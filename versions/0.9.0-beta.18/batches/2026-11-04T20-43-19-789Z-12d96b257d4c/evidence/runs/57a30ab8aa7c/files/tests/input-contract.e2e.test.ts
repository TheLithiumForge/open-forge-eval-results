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

test('modified arrows stay with the browser and do not move or activate cards', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(5).focus();
  for (const key of [
    'Shift+ArrowRight',
    'Control+ArrowDown',
    'Alt+ArrowLeft',
    'Meta+ArrowUp',
    'Shift+Enter',
    'Shift+Space',
  ]) {
    await page.keyboard.press(key);
    await expect(cards.nth(5)).toBeFocused();
  }
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

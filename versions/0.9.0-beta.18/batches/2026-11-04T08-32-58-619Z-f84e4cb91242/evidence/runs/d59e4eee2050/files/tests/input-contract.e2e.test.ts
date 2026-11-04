import { expect, test } from './browser-test.ts';
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

test('arrow movement stays available during a mismatch without changing the turn', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  for (const [key, index] of [
    ['ArrowRight', 2],
    ['ArrowDown', 6],
    ['ArrowLeft', 5],
    ['ArrowUp', 1],
  ] as const) {
    await page.keyboard.press(key);
    await expect(cards.nth(index)).toBeFocused();
    await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  }
  expect(await moves(page)).toBe(1);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(800);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

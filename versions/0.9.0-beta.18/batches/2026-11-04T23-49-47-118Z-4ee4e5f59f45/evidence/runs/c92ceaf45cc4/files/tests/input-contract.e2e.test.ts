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

test('arrow movement remains available during a mismatch and on matched cards', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(4).click();
  await cards.nth(5).click();
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards.nth(2)).toHaveClass('card closed');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');
  await expect(cards.nth(5)).toBeFocused();
  await expect(cards.nth(5)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  expect(await moves(page)).toBe(2);
});

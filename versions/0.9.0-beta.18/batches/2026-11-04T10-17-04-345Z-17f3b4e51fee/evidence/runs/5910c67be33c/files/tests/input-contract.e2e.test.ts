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

test('arrows remember a single tab stop without revealing cards or starting play', async ({
  page,
}) => {
  await loadTimedBoard(page);
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
    await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
    await expect(cards.nth(index)).toHaveAttribute('tabindex', '0');
  }
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards.nth(5)).toBeFocused();
  await page.clock.runFor(2000);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await moves(page)).toBe(0);
  await expect(page.locator('.stats dd').nth(2)).toHaveText('0:00');
});

test('arrows cross matched cards and a pending mismatch without changing the turn', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(2).click();
  await cards.nth(6).click();
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Space');
  expect(await moves(page)).toBe(1);
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(3)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(2);
  await page.clock.runFor(799);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(cards.nth(3)).toBeFocused();
  await expect(page.locator('.card.matched')).toHaveCount(2);
});

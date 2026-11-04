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

test('unsupported keys and modified keys leave board focus and play unchanged', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(5).focus();
  for (const key of ['Home', 'End', 'PageUp', 'PageDown', 'a']) {
    await page.keyboard.press(key);
    await expect(cards.nth(5)).toBeFocused();
  }
  for (const modifier of ['Alt', 'Control', 'Meta', 'Shift'])
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Space']) {
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(cards.nth(5)).toBeFocused();
      await expect(page.locator('.card.revealed')).toHaveCount(0);
    }
  expect(await moves(page)).toBe(0);
  await page.keyboard.press('Enter');
  await expect(cards.nth(5)).toHaveClass('card revealed');
});

test('arrow navigation continues through a mismatch and matched cards without activating them', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(1);
  await page.clock.runFor(800);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Space');
  expect(await moves(page)).toBe(2);
});

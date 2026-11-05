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

test('arrow navigation preserves turns, matched cards, and the remembered tab stop', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  // The documented board has a pair at positions 0 and 11 and a miss at 1 and 2.
  await cards.nth(0).click();
  await cards.nth(11).click();
  await cards.nth(1).click();
  await cards.nth(2).click();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.nth(0)).toBeFocused();
  await expect(cards.nth(0)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  expect(await moves(page)).toBe(2);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(0)).toBeFocused();
});

test('modified arrows and unrelated keys are left to the browser', async ({ page }) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  for (const options of [
    { key: 'ArrowLeft', altKey: true },
    { key: 'ArrowRight', ctrlKey: true },
    { key: 'ArrowUp', metaKey: true },
    { key: 'ArrowDown', shiftKey: true },
    { key: 'Home' },
  ]) {
    const prevented = await card.evaluate((element, init) => {
      const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    }, options);
    expect(prevented).toBe(false);
    await expect(card).toBeFocused();
  }
  expect(await moves(page)).toBe(0);
});

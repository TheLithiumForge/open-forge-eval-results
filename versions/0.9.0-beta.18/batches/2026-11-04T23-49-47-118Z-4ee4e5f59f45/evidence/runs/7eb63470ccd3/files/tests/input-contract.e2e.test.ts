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

test('arrow navigation preserves play state and leaves modified keys to the browser', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  // The fixed deal has a match at 2 and 6, and a mismatch at 0 and 1.
  await cards.nth(2).click();
  await cards.nth(6).click();
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(7)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards.nth(7)).toHaveClass(/closed/);
  expect(await moves(page)).toBe(2);

  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
    const prevented = await cards.nth(7).evaluate((card, key) => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
        [key]: true,
      });
      card.dispatchEvent(event);
      return event.defaultPrevented;
    }, modifier);
    expect(prevented).toBe(false);
    await expect(cards.nth(7)).toBeFocused();
  }
  await expect(cards.nth(7)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
});

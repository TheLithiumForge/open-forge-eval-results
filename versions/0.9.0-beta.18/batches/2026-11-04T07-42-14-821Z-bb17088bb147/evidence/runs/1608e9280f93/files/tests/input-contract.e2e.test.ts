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

test('arrow focus keeps moving during a mismatch while Enter and Space wait for it to close', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(cards.nth(2)).toHaveAttribute('tabindex', '0');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(1);
  await page.clock.runFor(800);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  expect(await moves(page)).toBe(2);
});

test('other navigation keys and modified arrows stay with the browser', async ({ page }) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const events = await card.evaluate((element) => {
    const keys: KeyboardEventInit[] = ['Home', 'End', 'PageUp', 'PageDown', 'Tab'].map((key) => ({
      key,
    }));
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
        keys.push({ key, [modifier]: true });
    return keys.map((options) => {
      const event = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return { prevented: event.defaultPrevented, focused: document.activeElement === element };
    });
  });
  expect(events.every((event) => !event.prevented && event.focused)).toBe(true);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await moves(page)).toBe(0);
});

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

test('modified arrows and other keys keep focus and their browser defaults', async ({ page }) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(5).focus();
  // Dispatch these combinations without invoking the browser's Alt+ArrowLeft shortcut.
  const results = await cards.nth(5).evaluate((card) => {
    const combinations: KeyboardEventInit[] = [];
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
        combinations.push({ key, [modifier]: true });
    for (const key of ['Tab', 'Home', 'End', 'PageUp', 'PageDown', 'a']) combinations.push({ key });
    return combinations.map((combination) => {
      const event = new KeyboardEvent('keydown', {
        ...combination,
        bubbles: true,
        cancelable: true,
      });
      card.dispatchEvent(event);
      return { prevented: event.defaultPrevented, focused: document.activeElement === card };
    });
  });
  expect(results).toEqual(results.map(() => ({ prevented: false, focused: true })));
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(cards.nth(5)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await moves(page)).toBe(0);
});

test('arrows reach matched cards and move during a mismatch without changing the turn', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  // The documented np1-4-1 deal matches positions 0 and 11; positions 1 and 2 miss.
  for (const index of [0, 11, 1, 2]) await cards.nth(index).click();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.first()).toBeFocused();
  await expect(cards.first()).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(4)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(2);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(4)).toBeFocused();
  await page.clock.runFor(799);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(cards.nth(4)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards.nth(4)).toHaveClass(/revealed/);
  expect(await moves(page)).toBe(2);
});

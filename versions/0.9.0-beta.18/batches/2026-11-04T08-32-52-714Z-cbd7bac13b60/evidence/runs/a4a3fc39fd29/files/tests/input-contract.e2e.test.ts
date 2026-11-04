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

test('arrow movement remembers one tab stop without changing the turn', async ({ page }) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(5).click();
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
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    expect(await moves(page)).toBe(0);
  }
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
});

test('only unmodified arrows are consumed by board navigation', async ({ page }) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const outcomes = await card.evaluate((element) => {
    const results = [];
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
        const event = new KeyboardEvent('keydown', {
          key,
          [modifier]: true,
          bubbles: true,
          cancelable: true,
        });
        element.dispatchEvent(event);
        results.push({
          prevented: event.defaultPrevented,
          focused: document.activeElement === element,
        });
      }
    }
    for (const key of ['Tab', 'Enter', ' ', 'Home', 'End', 'PageUp', 'PageDown', 'a']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      results.push({
        prevented: event.defaultPrevented,
        focused: document.activeElement === element,
      });
    }
    return results;
  });
  for (const result of outcomes) expect(result).toEqual({ prevented: false, focused: true });
  const prevented = await card.evaluate((element) => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(page.locator('.card').nth(6)).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('modifier shortcuts leave cards closed while native activation and primary clicks still work', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.first().focus();
  for (const modifier of ['Alt', 'Control', 'Meta', 'Shift'])
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(page.locator('.card.closed')).toHaveCount(16);
    }
  await page.keyboard.press('Enter');
  await expect(cards.first()).toHaveClass(/revealed/);
  // A modifier on a primary pointer click still uses the normal card action.
  await cards.nth(11).click({ modifiers: ['Shift'] });
  await expect(page.locator('.card.matched')).toHaveCount(2);
  expect(await moves(page)).toBe(1);
});

test('a pending mismatch allows movement while native keyboard activation stays blocked', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.first().focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(1);
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(1);
  await page.clock.runFor(800);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards.nth(5)).toHaveClass(/revealed/);
});

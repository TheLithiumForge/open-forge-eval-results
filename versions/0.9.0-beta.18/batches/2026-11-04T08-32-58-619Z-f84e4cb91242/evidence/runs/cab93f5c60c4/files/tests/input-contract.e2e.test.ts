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

test('unsupported keys and modified arrows preserve focus and browser defaults', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const ignored = await card.evaluate((button) => {
    const keys = ['Home', 'End', 'PageUp', 'PageDown', 'Escape', 'a'];
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const combinations = arrows.flatMap((key) =>
      ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].map((modifier) => ({ key, [modifier]: true })),
    );
    return [...keys.map((key) => ({ key })), ...combinations].map((combination) => {
      const event = new KeyboardEvent('keydown', {
        ...combination,
        bubbles: true,
        cancelable: true,
      });
      button.dispatchEvent(event);
      return { prevented: event.defaultPrevented, focused: document.activeElement === button };
    });
  });
  expect(ignored.every((event) => !event.prevented && event.focused)).toBe(true);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
});

test('modified Enter and Space keep cards closed while native activation still works', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').first();
  for (const modifier of ['Alt', 'Control', 'Meta', 'Shift']) {
    for (const key of ['Enter', 'Space']) {
      await card.focus();
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(page.locator('.card.revealed')).toHaveCount(0);
    }
  }
  await card.focus();
  await page.keyboard.press('Space');
  await expect(card).toHaveClass(/revealed/);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
});

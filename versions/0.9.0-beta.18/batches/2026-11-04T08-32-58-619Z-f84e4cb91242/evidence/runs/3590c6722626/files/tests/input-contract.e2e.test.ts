import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadFixedBoard, loadTimedBoard } from './game-fixture.ts';

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

test('modified arrows and unrelated keys leave board focus and game unchanged', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const before = await exportedSnapshot(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const results = await card.evaluate((element) => {
    const inputs: KeyboardEventInit[] = [{ key: 'Home' }, { key: 'End' }];
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
        inputs.push({ key, [modifier]: true });
    // Check the game's handling without invoking browser shortcuts outside the game contract.
    return inputs.map((input) => {
      const event = new KeyboardEvent('keydown', { ...input, bubbles: true, cancelable: true });
      return {
        key: input.key,
        unhandled: element.dispatchEvent(event),
        keptFocus: document.activeElement === element,
      };
    });
  });
  for (const result of results) {
    expect(result.unhandled, result.key).toBe(true);
    expect(result.keptFocus, result.key).toBe(true);
  }
  await expect(card).toBeFocused();
  expect(await exportedSnapshot(page)).toEqual(before);
});

import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadFixedBoard } from './game-fixture.ts';

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

test('modified keyboard input and unrelated keys leave board focus and play unchanged', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(5).focus();
  for (const modifier of ['Shift', 'Alt', 'Control', 'Meta']) {
    for (const key of ['ArrowRight', 'Enter', 'Space']) {
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(cards.nth(5)).toBeFocused();
      await expect(page.locator('.card.revealed')).toHaveCount(0);
    }
  }
  for (const key of ['Home', 'End', 'a']) {
    await page.keyboard.press(key);
    await expect(cards.nth(5)).toBeFocused();
  }
  expect(await exportedSnapshot(page)).toMatchObject({ moves: 0, started: false });
  await cards.nth(4).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  expect(await exportedSnapshot(page)).toMatchObject({ moves: 1 });
});

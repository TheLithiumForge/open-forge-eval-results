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

test('arrow movement keeps one remembered tab stop and leaves modified keys to the browser', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await expect(cards.nth(5)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await page.evaluate(() => {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight')
        document.body.dataset.keyPrevented = String(event.defaultPrevented);
    });
  });
  for (const modifier of ['Shift', 'Control', 'Alt', 'Meta']) {
    await page.keyboard.press(`${modifier}+ArrowRight`);
    await expect(cards.nth(5)).toBeFocused();
    await expect(page.locator('body')).toHaveAttribute('data-key-prevented', 'false');
  }
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

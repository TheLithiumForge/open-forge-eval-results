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

test('arrow navigation preserves the remembered tab stop and leaves modified keys to the browser', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(5).focus();
  await page.evaluate(() => {
    document.addEventListener('keydown', (event) => {
      document.body.dataset.keyPrevented = String(event.defaultPrevented);
    });
  });
  for (const key of [
    'Shift+ArrowRight',
    'Control+ArrowRight',
    'Alt+ArrowRight',
    'Meta+ArrowRight',
    'Home',
  ]) {
    await page.keyboard.press(key);
    await expect(cards.nth(5)).toBeFocused();
    await expect(page.locator('body')).toHaveAttribute('data-key-prevented', 'false');
  }
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(6)).toBeFocused();
  await expect(page.locator('body')).toHaveAttribute('data-key-prevented', 'true');
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(cards.nth(6)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(6)).toBeFocused();
});

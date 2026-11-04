import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('arrow navigation remembers one tab stop, stops at row edges and leaves play unchanged', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  const restart = page.getByRole('button', { name: 'Restart', exact: true });
  const notice = await page.getByRole('status').textContent();
  await restart.focus();
  await page.keyboard.press('Tab');
  await expect(cards.first()).toBeFocused();
  for (const [key, index] of [
    ['ArrowUp', 0],
    ['ArrowLeft', 0],
    ['ArrowDown', 4],
    ['ArrowLeft', 4],
    ['ArrowRight', 5],
    ['ArrowDown', 9],
    ['ArrowLeft', 8],
    ['ArrowUp', 4],
    ['ArrowUp', 0],
    ['ArrowRight', 1],
    ['ArrowRight', 2],
    ['ArrowRight', 3],
    ['ArrowRight', 3],
    ['ArrowDown', 7],
    ['ArrowRight', 7],
    ['ArrowDown', 11],
    ['ArrowDown', 15],
    ['ArrowDown', 15],
    ['ArrowLeft', 14],
    ['ArrowDown', 14],
  ] as const) {
    await page.keyboard.press(key);
    await expect(cards.nth(index)).toBeFocused();
    await expect(cards.nth(index)).toHaveAttribute('tabindex', '0');
    await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  }
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(14)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(restart).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards.nth(14)).toBeFocused();
  await expect(page.getByRole('status')).toHaveText(notice ?? '');
  expect(await exportedSnapshot(page)).toMatchObject({
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});

test('modified arrows and other keys stay with the browser while plain arrows are consumed', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const canceled = await card.evaluate((element) => {
    const results: boolean[] = [];
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
        results.push(
          !element.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              [modifier]: true,
              bubbles: true,
              cancelable: true,
            }),
          ),
        );
    for (const key of ['Home', 'End', 'PageUp', 'PageDown', 'Escape', 'a'])
      results.push(
        !element.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        ),
      );
    return results;
  });
  expect(canceled).toEqual(Array(22).fill(false));
  await expect(card).toBeFocused();
  for (const index of [5, 3]) {
    const from = page.locator('.card').nth(index);
    await from.focus();
    expect(
      await from.evaluate(
        (element) =>
          !element.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
          ),
      ),
    ).toBe(true);
  }
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('focus moves during a mismatch and through matched cards while activation follows turn rules', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(cards.nth(2)).toHaveClass('card closed');
  await page.clock.runFor(799);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  expect(await exportedSnapshot(page)).toMatchObject({
    matched: [2, 6],
    selection: { kind: 'closed' },
    moves: 2,
    elapsedMs: 800,
  });
});

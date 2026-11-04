import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { loadTimedBoard, moves } from './game-fixture.ts';

test('arrows move one card in each direction and stop at every board edge', async ({ page }) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  const announcement = await page.getByRole('status').textContent();
  for (const [from, key, to] of [
    [5, 'ArrowRight', 6],
    [5, 'ArrowLeft', 4],
    [5, 'ArrowUp', 1],
    [5, 'ArrowDown', 9],
    [4, 'ArrowLeft', 4],
    [7, 'ArrowRight', 7],
    [2, 'ArrowUp', 2],
    [14, 'ArrowDown', 14],
  ] as const) {
    await cards.nth(from).focus();
    await page.keyboard.press(key);
    await expect(cards.nth(to), `${key} from position ${from}`).toBeFocused();
    await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
    await expect(cards.nth(to)).toHaveAttribute('tabindex', '0');
  }
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await moves(page)).toBe(0);
  await expect(page.getByRole('status')).toHaveText(announcement ?? '');
});

test('Tab remembers arrow focus and native activation works through matches and a blocked turn', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  const restart = page.getByRole('button', { name: DealControl.restart, exact: true });
  await restart.focus();
  await page.keyboard.press('Tab');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(restart).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(5)).toBeFocused();
  await expect(cards.nth(5)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  expect(await moves(page)).toBe(1);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(2);
  await page.clock.runFor(800);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(cards.nth(2)).toBeFocused();
});

test('other keys and modified arrows keep their browser defaults and leave board focus alone', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  const allowed = await card.evaluate((element) => {
    const send = (init: KeyboardEventInit): boolean =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      );
    const otherKeys = ['Home', 'End', 'PageUp', 'PageDown', 'Escape', 'a'];
    const results = otherKeys.map((key) => send({ key }));
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
        results.push(send({ key, [modifier]: true }));
    return results;
  });
  expect(allowed.every(Boolean)).toBe(true);
  await expect(card).toBeFocused();
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await moves(page)).toBe(0);
});

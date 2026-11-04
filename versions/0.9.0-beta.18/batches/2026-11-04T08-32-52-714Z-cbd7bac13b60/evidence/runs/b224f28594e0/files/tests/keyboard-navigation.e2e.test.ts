import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { GRID_SIZES } from '../src/game/deck.ts';
import { loadTimedBoard, exportedSnapshot } from './game-fixture.ts';
import { moveKeyboardTo } from './accessibility-tree.ts';

test('arrow navigation keeps one remembered tab stop on every board size', async ({ page }) => {
  await loadTimedBoard(page);
  for (const size of GRID_SIZES) {
    await page.getByLabel(DealControl.size, { exact: true }).selectOption(String(size));
    await page.getByRole('button', { name: DealControl.restart, exact: true }).focus();
    await page.keyboard.press('Tab');
    const cards = page.locator('.card');
    await expect(cards.first()).toBeFocused();
    for (const [key, index] of [
      ['ArrowRight', 1],
      ['ArrowDown', size + 1],
      ['ArrowLeft', size],
      ['ArrowUp', 0],
      ['ArrowLeft', 0],
      ['ArrowUp', 0],
    ] as const) {
      await page.keyboard.press(key);
      await expect(cards.nth(index)).toBeFocused();
      await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
      await expect(cards.nth(index)).toHaveAttribute('tabindex', '0');
    }
    const last = size ** 2 - 1;
    await moveKeyboardTo(page, last, size);
    for (const key of ['ArrowRight', 'ArrowDown']) {
      await page.keyboard.press(key);
      await expect(cards.last()).toBeFocused();
    }
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    const remembered = cards.nth(last - size - 1);
    await expect(remembered).toBeFocused();
    await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
    await expect(remembered).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(remembered).toBeFocused();
    expect(await exportedSnapshot(page)).toMatchObject({
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    });
  }
});

test('board navigation consumes only arrow keys and leaves input editing with the browser', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.evaluate(() => {
    const keys: { key: string; prevented: boolean }[] = [];
    document.addEventListener('keydown', (event) => {
      keys.push({ key: event.key, prevented: event.defaultPrevented });
      document.body.dataset.keyboardEvents = JSON.stringify(keys);
    });
  });
  await page.locator('.card').nth(5).focus();
  const arrows = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  const otherKeys = ['Home', 'End', 'PageUp', 'PageDown', 'Escape', 'a'];
  for (const key of [...arrows, ...otherKeys]) await page.keyboard.press(key);
  await expect(page.locator('.card').nth(5)).toBeFocused();
  expect(await page.locator('body').getAttribute('data-keyboard-events')).toBe(
    JSON.stringify([
      ...arrows.map((key) => ({ key, prevented: true })),
      ...otherKeys.map((key) => ({ key, prevented: false })),
    ]),
  );
  await page.locator('summary').click();
  const code = page.getByLabel('Board code', { exact: true });
  await code.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(code).toBeFocused();
  expect(
    await code.evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) throw new Error('Expected the board code input.');
      return element.selectionStart;
    }),
  ).toBe(1);
});

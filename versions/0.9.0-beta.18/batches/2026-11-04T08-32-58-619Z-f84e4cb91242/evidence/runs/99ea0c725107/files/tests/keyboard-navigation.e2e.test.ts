import { expect, test } from './browser-test.ts';
import { loadFixedBoard, moves } from './game-fixture.ts';

test('modified arrows and other keys stay with the browser', async ({ page }) => {
  await loadFixedBoard(page);
  const card = page.locator('.card').nth(5);
  await card.focus();
  await page.evaluate(() => {
    const events: {
      key: string;
      shift: boolean;
      control: boolean;
      alt: boolean;
      meta: boolean;
      prevented: boolean;
    }[] = [];
    document.addEventListener('keydown', (event) => {
      if (!(event.target instanceof HTMLButtonElement) || !event.target.matches('.card')) return;
      if (!event.key.startsWith('Arrow') && event.key !== 'Home') return;
      events.push({
        key: event.key,
        shift: event.shiftKey,
        control: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
        prevented: event.defaultPrevented,
      });
      document.body.dataset.keyboardEvents = JSON.stringify(events);
    });
  });

  for (const key of [
    'Shift+ArrowRight',
    'Control+ArrowUp',
    'Alt+ArrowLeft',
    'Meta+ArrowDown',
    'Home',
  ]) {
    await page.keyboard.press(key);
    await expect(card).toBeFocused();
  }

  const events: unknown = await page.evaluate(() =>
    JSON.parse(document.body.dataset.keyboardEvents ?? '[]'),
  );
  expect(events).toEqual([
    { key: 'ArrowRight', shift: true, control: false, alt: false, meta: false, prevented: false },
    { key: 'ArrowUp', shift: false, control: true, alt: false, meta: false, prevented: false },
    { key: 'ArrowLeft', shift: false, control: false, alt: true, meta: false, prevented: false },
    { key: 'ArrowDown', shift: false, control: false, alt: false, meta: true, prevented: false },
    { key: 'Home', shift: false, control: false, alt: false, meta: false, prevented: false },
  ]);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await moves(page)).toBe(0);
});

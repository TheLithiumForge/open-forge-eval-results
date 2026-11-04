import { expect, test } from '@playwright/test';
import { card, exported, frozenClock, loadBoard, loadSnapshot } from './gameActions.ts';

test('each repeated turn result is a new live update, without repeats from time, focus or closing', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await loadBoard(page);
  const live = page.locator('[aria-live]');
  await expect(live).toHaveCount(1);
  await expect(live).toHaveAttribute('aria-live', 'polite');
  await expect(live).toHaveAttribute('aria-atomic', 'true');
  await live.evaluate((element) => {
    const updates: string[] = [];
    Object.defineProperty(element, 'recordedUpdates', { value: updates });
    new MutationObserver(() => { updates.push(element.textContent ?? ''); }).observe(element, { childList: true, subtree: true });
  });
  for (let turn = 0; turn < 2; turn += 1) {
    await card(page, 0).click();
    await card(page, 1).click();
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(1000);
    await exported(page);
  }
  const updates: unknown = await live.evaluate((element) => Reflect.get(element, 'recordedUpdates'));
  expect(updates).toEqual(['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.']);
  await loadSnapshot(page, '{');
  await expect(live).toHaveText('Invalid snapshot.');
  await page.clock.runFor(1000);
  const afterLoad: unknown = await live.evaluate((element) => Reflect.get(element, 'recordedUpdates'));
  expect(afterLoad).toEqual([...['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.'], 'Invalid snapshot.']);
});

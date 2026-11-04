import { expect, test } from '@playwright/test';
import { loadBoard, reveal, start } from './helpers.ts';

test('consecutive identical turns each announce once, without time or focus repeats', async ({ page }) => {
  await start(page, true);
  await loadBoard(page);
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toHaveCount(1);
  await expect(live).toHaveAttribute('aria-atomic', 'true');
  const counts = await live.evaluateHandle((region) => {
    const state: { events: number; texts: string[] } = { events: 0, texts: [] };
    new MutationObserver(() => { state.events += 1; state.texts.push(region.textContent ?? ''); })
      .observe(region, { childList: true, characterData: true, subtree: true });
    return state;
  });
  for (let turn = 0; turn < 2; turn += 1) {
    await reveal(page, 0);
    await reveal(page, 1);
    await expect(live).toHaveText('No match. Cards close after a short pause.');
    expect((await counts.jsonValue()).events).toBe(turn + 1);
    await page.locator('.card').nth(2).focus();
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(1500);
    expect((await counts.jsonValue()).events).toBe(turn + 1);
  }
  await reveal(page, 0);
  await reveal(page, 11);
  await expect(live).toHaveText('Pair found. 1 pair matched.');
  expect((await counts.jsonValue()).events).toBe(3);
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  for (let count = 4; count <= 5; count += 1) {
    await page.getByRole('button', { name: 'Load board', exact: true }).click({ force: true });
    await expect(live).toHaveText('Invalid board code.');
    expect((await counts.jsonValue()).events).toBe(count);
  }
});

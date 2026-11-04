import { expect, test } from '@playwright/test';
import { almostWon, cards, frozen, loadBoard, loadSnapshot } from './actions.ts';

test('one atomic polite region announces each event once, including identical consecutive misses', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  const region = page.locator('[aria-live]');
  await expect(region).toHaveCount(1);
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await expect(region).toHaveAttribute('aria-atomic', 'true');
  await region.evaluate((node) => {
    const events: string[] = [];
    node.setAttribute('data-test-events', '[]');
    new MutationObserver(() => {
      events.push(node.textContent ?? '');
      node.setAttribute('data-test-events', JSON.stringify(events));
    }).observe(node, { childList: true, subtree: true, characterData: true });
  });
  const miss = 'No match. Cards close after a short pause.';
  for (let turn = 0; turn < 2; turn += 1) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(800);
  }
  await expect(region).toHaveAttribute('data-test-events', JSON.stringify([miss, miss]));
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await page.clock.runFor(1250);
  await expect(region).toHaveAttribute('data-test-events', JSON.stringify([miss, miss, 'Pair found. 1 pair matched.']));
  await loadSnapshot(page, almostWon(7, 60000));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  const win = 'Pair found. All pairs found in 8 moves and 1:00.';
  await expect(region).toHaveAttribute('data-test-events', JSON.stringify([miss, miss,
    'Pair found. 1 pair matched.', 'Loaded snapshot. Select Resume to continue.', win]));
  await page.clock.runFor(2000);
  await expect(region).toHaveText(win);
  await expect(region).toHaveAttribute('data-test-events', JSON.stringify([miss, miss,
    'Pair found. 1 pair matched.', 'Loaded snapshot. Select Resume to continue.', win]));
});

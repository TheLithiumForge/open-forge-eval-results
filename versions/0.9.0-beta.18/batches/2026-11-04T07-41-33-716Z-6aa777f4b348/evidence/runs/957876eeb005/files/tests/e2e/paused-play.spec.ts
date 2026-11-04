import { expect, test } from '@playwright/test';
import { cards, freezeClock, openGame } from './deal-actions.ts';
import { exportState, loadSnapshot, nearlyCompletedSnapshot } from './snapshot-actions.ts';

test('import pause blocks an otherwise eligible reveal and Resume permits completion', async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  await loadSnapshot(page, nearlyCompletedSnapshot());
  await cards(page).first().click();
  await page.keyboard.press('Space');
  await page.clock.runFor(5000);
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  const frozen = await exportState(page);
  expect(frozen.selection).toEqual({ kind: 'closed' });
  expect(frozen.moves).toBe(7);
  expect(frozen.elapsedMs).toBe(12345);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await cards(page).nth(11).click();
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
});

import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('names do not enter preferences and reload starts unnamed at the saved size', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('Private deal name');
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(preferences).not.toContain('Private deal name');
  expect(preferences).not.toContain('"name"');

  await page.reload();
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('6');
  await expect(page.locator('.card')).toHaveCount(36);
  await page.locator('summary').click();
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue('');
  await page.locator('summary').click();
  expect((await exportedSnapshot(page)).version).toBe(1);
});

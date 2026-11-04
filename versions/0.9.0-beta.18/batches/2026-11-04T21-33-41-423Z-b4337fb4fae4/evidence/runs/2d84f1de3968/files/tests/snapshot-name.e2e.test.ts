import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('a named game can be exported, loaded in a different order, and renamed', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await name.fill('Evening ✨');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const saved = JSON.parse(await snapshot.inputValue());
  expect(saved.name).toBe('Evening ✨');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await snapshot.fill(JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Evening ✨');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('button', { name: ReproductionControl.resume })).toBeVisible();
  await name.fill('Another name');
  await snapshot.fill('{');
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Another name');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  expect(JSON.parse(await snapshot.inputValue()).name).toBe('Another name');
});

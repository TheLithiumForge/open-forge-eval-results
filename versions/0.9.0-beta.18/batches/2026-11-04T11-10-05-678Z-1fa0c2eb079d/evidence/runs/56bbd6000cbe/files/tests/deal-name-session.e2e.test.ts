import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('new deals and reload clear the name while saved preferences keep no name', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('');
  await name.fill('  Café run  ');
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(preferences).not.toContain('Café run');

  const newGame = page.getByRole('button', { name: DealControl.newGame, exact: true });
  await newGame.click();
  await expect(name).toHaveValue('');

  await name.fill('restarted');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');

  await name.fill('resized');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(36);

  await name.fill('kept after failed load');
  const board = page.getByLabel(ReproductionControl.board, { exact: true });
  await board.fill('invalid');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('kept after failed load');
  await expect(page.locator('.load-notice')).toHaveText('Invalid board code.');

  await board.fill('np1-8-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(64);
  await name.fill('reload label');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('8');
  await expect(name).toHaveValue('');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  await expect(page.getByLabel(ReproductionControl.snapshot, { exact: true })).toHaveValue(
    /"version": 1/,
  );
});

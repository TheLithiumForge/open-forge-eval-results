import { expect, test } from './browser-test.ts';
import assert from 'node:assert/strict';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';

test('names survive export and unordered import, and clear on a new deal', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const exportButton = page.getByRole('button', { name: ReproductionControl.exportSnapshot });
  const loadButton = page.getByRole('button', { name: ReproductionControl.loadSnapshot });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill(' Café ');
  await exportButton.click();
  const saved: unknown = JSON.parse(await snapshot.inputValue());
  assert.ok(isJsonObject(saved));
  expect(saved.version).toBe(2);
  expect(saved.name).toBe(' Café ');
  expect(saved.selection).toEqual({ kind: 'one', index: 2 });
  await name.fill('changed');
  const { version, ...fields } = saved;
  await snapshot.fill(JSON.stringify({ ...fields, version }));
  await loadButton.click();
  await expect(name).toHaveValue(' Café ');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await name.fill('paused');
  await page.locator('.card').nth(0).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: ReproductionControl.resume }).click();
  await expect(page.locator('.card').nth(0)).toBeFocused();
  await page.getByRole('button', { name: DealControl.restart }).click();
  await expect(name).toHaveValue('');
  await exportButton.click();
  const unnamed: unknown = JSON.parse(await snapshot.inputValue());
  assert.ok(isJsonObject(unnamed));
  expect(unnamed.version).toBe(1);
  await name.fill('again');
  await loadButton.click();
  await expect(name).toHaveValue('');
  await name.fill('new');
  await page.getByRole('button', { name: DealControl.newGame }).click();
  await expect(name).toHaveValue('');
});

test('completed named imports stay static and names clear on board and size changes', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await snapshot.fill(
    JSON.stringify({
      name: 'Finished',
      version: 2,
      boardCode: 'np1-4-1',
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: 'closed' },
      moves: 8,
      elapsedMs: 1000,
      started: true,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot }).click();
  await expect(name).toHaveValue('Finished');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await name.fill('edited');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard }).click();
  await expect(name).toHaveValue('');
  await name.fill('size');
  await page.getByLabel(DealControl.size).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('reload');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

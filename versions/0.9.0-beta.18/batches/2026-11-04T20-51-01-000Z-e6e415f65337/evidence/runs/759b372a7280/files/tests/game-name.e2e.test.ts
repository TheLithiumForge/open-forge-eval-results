import { expect, test } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadFixedBoard } from './game-fixture.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';

test('a game name is saved with the snapshot and returns when the snapshot is loaded', async ({
  page,
}) => {
  await loadFixedBoard(page);
  await page.locator('.card').first().click();
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await name.fill('Friday warm-up');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const saved = await field.inputValue();
  expect(JSON.parse(saved)).toMatchObject({ name: 'Friday warm-up' });
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue('Friday warm-up');
  await page.getByRole('combobox', { name: 'Grid size', exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await field.fill(saved);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Friday warm-up');
  await page.locator('summary').click();
  expect((await exportedSnapshot(page)).name).toBe('Friday warm-up');
});

test('a pasted snapshot loads with reordered fields and without a name', async ({ page }) => {
  await loadFixedBoard(page);
  await page.locator('summary').click();
  const pasted = {
    started: true,
    selection: { kind: SelectionKind.one, index: 0 },
    moves: 0,
    elapsedMs: 250,
    matched: [],
    boardCode: EXAMPLE_CODE,
    version: SNAPSHOT_VERSION,
  };
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(JSON.stringify(pasted));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
  await page.locator('summary').click();
  expect((await exportedSnapshot(page)).elapsedMs).toBe(pasted.elapsedMs);
});

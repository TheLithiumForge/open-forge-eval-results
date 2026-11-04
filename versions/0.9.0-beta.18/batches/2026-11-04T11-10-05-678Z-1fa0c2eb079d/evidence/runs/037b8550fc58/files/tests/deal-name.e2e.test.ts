import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const VERSION_ONE = {
  version: 1,
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.one, index: 0 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('deal names export and restore with named snapshots and clear on version 1 imports', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café 😊  ');
  await page.locator('summary').click();
  await page.locator('.card').nth(2).click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({ version: 2, name: '  Café 😊  ', started: true, moves: 0 });
  expect(saved.selection).toEqual({ kind: SelectionKind.one, index: 2 });

  await page.locator('summary').click();
  await name.fill('Temporary name');
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('  Café 😊  ');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await name.fill('');
  await expect(name).toHaveValue('');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.locator('summary').click();
  const cleared = await exportedSnapshot(page);
  expect(cleared.version).toBe(1);
  expect(cleared).not.toHaveProperty('name');

  await page.locator('summary').click();
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(VERSION_ONE));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  const legacy = await exportedSnapshot(page);
  expect(legacy.version).toBe(1);
  expect(legacy).not.toHaveProperty('name');
});

test('editing a name leaves the live mismatch and its active timer unchanged', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const before = await exportedSnapshot(page);

  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await name.fill('Live mismatch');
  await expect(name).toBeFocused();
  await page.locator('summary').click();
  const after = await exportedSnapshot(page);
  expect(after).toMatchObject({ ...before, version: 2, name: 'Live mismatch' });
  expect(after.selection).toEqual(before.selection);
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('deal names stay out of preferences and clear on replacement while failed loads preserve them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await name.fill('Keep this name');
  const boardCode = page.getByLabel(ReproductionControl.board, { exact: true });
  await boardCode.fill('invalid');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('Keep this name');
  await expect(page.locator('.load-notice')).toHaveText('Invalid board code.');

  await boardCode.fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Clear on restart');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Clear on size change');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Clear on new game');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Do not persist');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
});

test('completed named snapshots remain static and can be renamed', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(
    JSON.stringify({
      version: 2,
      name: 'Finished deal',
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: SelectionKind.closed },
      moves: EXAMPLE_PAIRS.length,
      elapsedMs: 500,
      started: true,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue('Finished deal');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await name.fill('Renamed after the win');
  await page.locator('summary').click();
  expect((await exportedSnapshot(page)).name).toBe('Renamed after the win');
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
});

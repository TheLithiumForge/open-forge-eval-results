import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { DEAL_NAME_MAX_LENGTH } from '../src/game/deal-name.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { NAMED_SNAPSHOT_VERSION, SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('editing a name preserves active progress and export switches formats', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', String(DEAL_NAME_MAX_LENGTH));
  await name.fill('x'.repeat(DEAL_NAME_MAX_LENGTH));
  await name.pressSequentially('x');
  await expect(name).toHaveValue('x'.repeat(DEAL_NAME_MAX_LENGTH));
  await name.fill('');
  await page.locator('summary').click();

  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  await name.fill('  Café 🧩  ');
  await expect(name).toBeFocused();
  await page.locator('summary').click();
  const named = await exportedSnapshot(page);
  expect(named).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: '  Café 🧩  ',
    boardCode: before.boardCode,
    matched: before.matched,
    selection: before.selection,
    moves: before.moves,
    elapsedMs: before.elapsedMs,
    started: before.started,
  });

  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(SNAPSHOT_VERSION);
  expect(Object.hasOwn(unnamed, 'name')).toBe(false);
});

test('a named paused snapshot restores its name and exact mismatch time', async ({ page }) => {
  await loadTimedBoard(page);
  const draft = {
    boardCode: EXAMPLE_CODE,
    name: 'Imported Café',
    version: NAMED_SNAPSHOT_VERSION,
    matched: [],
    selection: {
      remainingMs: 300,
      second: 1,
      kind: SelectionKind.mismatch,
      first: 0,
    },
    moves: 1,
    elapsedMs: 500,
    started: true,
  };
  await page.locator('summary').click();
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await field.fill(JSON.stringify(draft));
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await load.click();
  await expect(load).toBeFocused();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('Imported Café');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await name.fill('Renamed while paused');
  await page.locator('summary').click();
  const paused = await exportedSnapshot(page);
  expect(paused).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Renamed while paused',
    elapsedMs: 500,
    moves: 1,
    selection: { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: 300 },
  });

  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await expect(page.locator('.card').nth(2)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(name).toHaveValue('Renamed while paused');
});

test('fresh deals clear names, version 1 imports clear names, and reload keeps only size', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await name.fill('New deal');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Restarted deal');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Resized deal');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');

  await name.fill('Board code deal');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Legacy import');
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(
    JSON.stringify({
      boardCode: EXAMPLE_CODE,
      version: SNAPSHOT_VERSION,
      matched: [],
      selection: { kind: SelectionKind.closed },
      moves: 0,
      elapsedMs: 0,
      started: false,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await name.fill('Not a preference');

  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('6');
});

test('completed named imports stay static and editable without changing best scores', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(
    JSON.stringify({
      version: NAMED_SNAPSHOT_VERSION,
      name: 'Won game',
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: SelectionKind.closed },
      moves: EXAMPLE_PAIRS.length,
      elapsedMs: 500,
      started: true,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('Won game');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: ReproductionControl.resume })).toHaveCount(0);
  await expect(page.locator('.stats > div').nth(3)).toHaveText('Best: none');
  await name.fill('Changed after completion');
  await page.locator('summary').click();
  const completed = await exportedSnapshot(page);
  expect(completed).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Changed after completion',
    matched: EXAMPLE_PAIRS.flat().sort((first, second) => first - second),
  });
  await expect(page.locator('.stats > div').nth(3)).toHaveText('Best: none');
});

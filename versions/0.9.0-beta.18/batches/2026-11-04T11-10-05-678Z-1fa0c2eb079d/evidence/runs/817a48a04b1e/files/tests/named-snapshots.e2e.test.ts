import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('named progress loads from reordered fields and legacy snapshots clear the name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.gameName, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await expect(name).toHaveAttribute('maxlength', '120');
  await page.locator('.card').first().click();
  await page.clock.runFor(125);
  await name.fill('Kitchen Table');
  await page.clock.runFor(100);
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot }).click();
  const exported: unknown = JSON.parse(await snapshot.inputValue());
  if (!isJsonObject(exported)) throw new Error('Expected an exported snapshot object.');
  expect(exported.name).toBe('Kitchen Table');
  expect(exported.elapsedMs).toBeGreaterThan(125);

  await name.fill('Unsaved title');
  await snapshot.fill(
    JSON.stringify({
      boardCode: exported.boardCode,
      name: exported.name,
      matched: exported.matched,
      selection: exported.selection,
      moves: exported.moves,
      elapsedMs: exported.elapsedMs,
      started: exported.started,
      version: SNAPSHOT_VERSION,
    }),
  );
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot });
  await load.click();
  await expect(name).toHaveValue('Kitchen Table');
  await expect(page.locator('.card.revealed')).toHaveCount(1);

  await snapshot.fill('{');
  await load.click();
  await expect(name).toHaveValue('Kitchen Table');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');

  await snapshot.fill(
    JSON.stringify({
      version: SNAPSHOT_VERSION,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    }),
  );
  await load.click();
  await expect(name).toHaveValue('');

  await name.fill('Restart keeps it');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('Restart keeps it');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
});

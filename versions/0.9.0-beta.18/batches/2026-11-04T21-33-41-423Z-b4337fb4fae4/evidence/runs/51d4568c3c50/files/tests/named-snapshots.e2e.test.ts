import { expect, test } from './browser-test.ts';
import { ReproductionControl, DealControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('deal names export, restore from reordered pasted snapshots and clear on restart', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').first().click();
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill(' Café ');
  const exportButton = page.getByRole('button', {
    name: ReproductionControl.exportSnapshot,
    exact: true,
  });
  await exportButton.click();
  const value: unknown = JSON.parse(await snapshot.inputValue());
  if (!isJsonObject(value)) throw new Error('Expected an exported snapshot object.');
  const named = value;
  expect(named.version).toBe(2);
  expect(named.name).toBe(' Café ');
  expect(named.selection).toEqual({ kind: 'one', index: 0 });

  const pasted = JSON.stringify({
    started: named.started,
    elapsedMs: named.elapsedMs,
    selection: named.selection,
    moves: named.moves,
    boardCode: named.boardCode,
    name: named.name,
    version: named.version,
    matched: named.matched,
  });
  await snapshot.fill(pasted);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue(' Café ');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await expect(page.locator('.card.revealed')).toHaveCount(1);

  await snapshot.fill(
    JSON.stringify({
      version: 1,
      boardCode: named.boardCode,
      matched: named.matched,
      selection: named.selection,
      moves: named.moves,
      elapsedMs: named.elapsedMs,
      started: named.started,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
});

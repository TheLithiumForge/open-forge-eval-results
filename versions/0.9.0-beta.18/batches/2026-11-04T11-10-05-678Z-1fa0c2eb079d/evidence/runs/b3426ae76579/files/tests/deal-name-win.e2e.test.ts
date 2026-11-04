import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { NAMED_SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('winning after Resume keeps an imported name and records the local best', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(
    JSON.stringify({
      name: 'Imported game',
      boardCode: EXAMPLE_CODE,
      version: NAMED_SNAPSHOT_VERSION,
      matched: [],
      selection: { kind: SelectionKind.one, index: 0 },
      moves: 0,
      elapsedMs: 0,
      started: true,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.locator('.card').nth(11).click();
  for (const [first, second] of EXAMPLE_PAIRS) {
    if (first !== 0) {
      await page.locator('.card').nth(first).click();
      await page.locator('.card').nth(second).click();
    }
  }

  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(page.locator('.stats > div').nth(3)).toHaveText('Best: 8');
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue(
    'Imported game',
  );
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Imported game',
    moves: 8,
  });
});

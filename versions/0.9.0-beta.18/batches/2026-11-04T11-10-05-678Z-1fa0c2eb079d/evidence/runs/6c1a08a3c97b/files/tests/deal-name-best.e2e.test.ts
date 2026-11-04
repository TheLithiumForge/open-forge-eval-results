import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('named completed imports stay static and a resumed named game can set a best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const load = page.getByRole('button', {
    name: ReproductionControl.loadSnapshot,
    exact: true,
  });
  const name = page.getByLabel(ReproductionControl.name, { exact: true });

  await snapshot.fill(
    JSON.stringify({
      version: 2,
      name: '  Finished Café  ',
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: SelectionKind.closed },
      moves: EXAMPLE_PAIRS.length,
      elapsedMs: 500,
      started: true,
    }),
  );
  await load.click();
  await expect(name).toHaveValue('  Finished Café  ');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await name.fill('Edited after the win');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);

  const lastPair = EXAMPLE_PAIRS.at(-1);
  if (!lastPair) throw new Error('Expected a final pair in the example board.');
  await snapshot.fill(
    JSON.stringify({
      version: 2,
      name: 'Unfinished Café',
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
      selection: { kind: SelectionKind.one, index: lastPair[0] },
      moves: EXAMPLE_PAIRS.length - 1,
      elapsedMs: 1000,
      started: true,
    }),
  );
  await load.click();
  await expect(name).toHaveValue('Unfinished Café');
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.locator('.card').nth(lastPair[1]).click();
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
});

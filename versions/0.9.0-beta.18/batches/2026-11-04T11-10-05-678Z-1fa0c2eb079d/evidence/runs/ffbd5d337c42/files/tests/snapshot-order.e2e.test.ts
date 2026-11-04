import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('pasted reordered progress loads while unknown and missing fields keep the current game', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const saved = {
    elapsedMs: 1500,
    selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
    started: true,
    matched: [0, 11],
    boardCode: EXAMPLE_CODE,
    moves: 2,
    version: 1,
  };
  await page.locator('summary').click();
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await field.fill(JSON.stringify(saved));
  await load.click();
  await expect(load).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(saved);

  const { started: omitted, ...missing } = saved;
  expect(omitted).toBe(true);
  for (const invalid of [{ ...saved, unknown: true }, missing]) {
    await page.locator('summary').click();
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    await load.click();
    await expect(field).toHaveValue(draft);
    await expect(load).toBeFocused();
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(saved);
    await expect(
      page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
    ).toBeVisible();
  }
});

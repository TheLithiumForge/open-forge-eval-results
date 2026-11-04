import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { NAMED_SNAPSHOT_VERSION, SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('invalid named snapshots keep the draft and paused progress', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  const base = {
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Kept name',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: {
      kind: SelectionKind.mismatch,
      first: 0,
      second: 1,
      remainingMs: 300,
    },
    moves: 1,
    elapsedMs: 500,
    started: true,
  };
  await field.fill(JSON.stringify(base));
  await load.click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  const resume = page.getByRole('button', { name: ReproductionControl.resume, exact: true });
  await expect(name).toHaveValue('Kept name');
  const invalid: readonly Record<string, unknown>[] = [
    { ...base, name: '' },
    { ...base, name: 'x'.repeat(41) },
    { ...base, name: 'line\nbreak' },
    { ...base, name: undefined },
    { ...base, version: 3 },
    { ...base, extra: true },
  ];
  for (const value of invalid) {
    const draft = JSON.stringify(value);
    await field.fill(draft);
    await load.click();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('Kept name');
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(load).toBeFocused();
    await expect(resume).toBeVisible();
    await page.clock.runFor(500);
    await expect(page.locator('.card.revealed')).toHaveCount(2);
  }
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Kept name',
    selection: {
      kind: SelectionKind.mismatch,
      first: 0,
      second: 1,
      remainingMs: 300,
    },
    moves: 1,
    elapsedMs: 500,
  });
});

test('a reordered version 1 paste loads and clears a name', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('Before legacy load');
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await field.fill(
    JSON.stringify({
      boardCode: EXAMPLE_CODE,
      started: false,
      selection: { kind: SelectionKind.closed },
      elapsedMs: 0,
      version: SNAPSHOT_VERSION,
      matched: [],
      moves: 0,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue('');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
});

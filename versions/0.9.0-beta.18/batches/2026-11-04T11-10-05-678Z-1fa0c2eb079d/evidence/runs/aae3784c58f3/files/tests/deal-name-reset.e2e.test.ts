import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('fresh-deal actions, v1 imports and reload clear the deal name', async ({ page, gameURL }) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const giveName = async (value: string) => name.fill(value);

  await giveName('New game');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await giveName('Restarted');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
  await giveName('Resized');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(36);

  await giveName('Board code');
  const board = page.getByLabel(ReproductionControl.board, { exact: true });
  await board.fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(16);

  await giveName('Legacy name');
  const legacy = {
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  };
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(JSON.stringify(legacy));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');

  await giveName('Only in this session');
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  await page.reload();
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    preferences,
  );
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
  await page.locator('summary').click();
  const fresh = await exportedSnapshot(page);
  expect(fresh).toMatchObject({
    version: 1,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  expect(fresh.name).toBeUndefined();
});

test('pasted v1 and v2 snapshots accept a version field in different positions', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const legacy = {
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  };
  await field.fill(JSON.stringify(legacy));
  await load.click();
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await expect(name).toHaveValue('');

  const named = {
    name: '  Café  ',
    boardCode: EXAMPLE_CODE,
    version: 2,
    matched: [2, 6],
    selection: { kind: 'one', index: 3 },
    moves: 1,
    elapsedMs: 0,
    started: true,
  };
  await field.fill(JSON.stringify(named));
  await load.click();
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await expect(name).toHaveValue('  Café  ');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.locator('summary').click();
  const beforeInvalidDrafts = await exportedSnapshot(page);

  for (const invalid of [
    { ...named, name: '' },
    { ...named, version: 3 },
    { ...named, extra: true },
    { ...legacy, name: 'Not part of version one' },
  ]) {
    await page.locator('summary').click();
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    await load.click();
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('  Café  ');
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(beforeInvalidDrafts);
  }
});

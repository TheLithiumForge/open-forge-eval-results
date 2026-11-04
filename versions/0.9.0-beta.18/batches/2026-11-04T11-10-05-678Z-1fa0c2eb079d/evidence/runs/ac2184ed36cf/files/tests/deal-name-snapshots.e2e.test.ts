import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

function pendingNamedSnapshot(name: string): string {
  return JSON.stringify({
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: 300 },
    moves: 1,
    elapsedMs: 500,
    started: true,
    name,
    version: 2,
  });
}

test('unordered named imports restore while paused and keep the mismatch timer through Resume', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const draft = pendingNamedSnapshot('Café');
  await snapshot.fill(draft);
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue('Café');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('.card').nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.locator('.card').nth(3).click();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('Lunch');

  const invalid = JSON.stringify({
    version: 2,
    name: '',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: 300 },
    moves: 1,
    elapsedMs: 500,
    started: true,
  });
  await snapshot.fill(invalid);
  await load.click();
  await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  await expect(snapshot).toHaveValue(invalid);
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue('Lunch');
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: 'Lunch',
    elapsedMs: 500,
    selection: { kind: SelectionKind.mismatch, remainingMs: 300 },
  });
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('completed named imports stay static and later wins still update the best', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, size: 4, bestMoves: { 4: 10 } }));
  }, PREFERENCES_KEY);
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const complete = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: SelectionKind.closed },
    moves: EXAMPLE_PAIRS.length,
    elapsedMs: 1000,
    started: true,
    name: 'Completed Café',
    version: 2,
  });
  await snapshot.fill(complete);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('10');
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue(
    'Completed Café',
  );
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('Renamed win');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);

  const unfinished = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.one, index: EXAMPLE_PAIRS[0]?.[0] },
    moves: 0,
    elapsedMs: 1000,
    started: true,
    name: 'Keep through win',
    version: 2,
  });
  await snapshot.fill(unfinished);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) await page.locator('.card').nth(index).click();
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.load-notice')).toHaveText('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Keep through win' });
});

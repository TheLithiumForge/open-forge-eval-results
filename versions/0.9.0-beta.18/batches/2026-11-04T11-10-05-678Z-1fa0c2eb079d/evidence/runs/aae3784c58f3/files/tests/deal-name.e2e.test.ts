import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { exportedSnapshot, finishBoard, loadTimedBoard } from './game-fixture.ts';

const DISPLAY_NAME = '  Café 🐈  ';

test('a named mismatch export imports paused and resumes for its exact remaining time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill(DISPLAY_NAME);
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveValue(DISPLAY_NAME);
  await page.locator('summary').click();

  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({
    version: 2,
    name: DISPLAY_NAME,
    boardCode: EXAMPLE_CODE,
    moves: 1,
    selection: { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: 600 },
  });

  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(JSON.stringify(saved));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue(DISPLAY_NAME);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  await name.fill('Paused edit');
  await page.locator('summary').click();
  const paused = await exportedSnapshot(page);
  expect(paused).toMatchObject({ name: 'Paused edit', elapsedMs: saved.elapsedMs });
  expect(paused.selection).toMatchObject({ kind: SelectionKind.mismatch, remainingMs: 600 });

  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await finishBoard(page);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Paused edit' });
});

test('editing a deal name leaves active progress and elapsed time alone', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(300);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill(DISPLAY_NAME);
  await expect(name).toBeFocused();
  await page.clock.runFor(700);
  await page.locator('summary').click();
  const after = await exportedSnapshot(page);
  expect(after).toMatchObject({
    version: 2,
    name: DISPLAY_NAME,
    boardCode: before.boardCode,
    matched: before.matched,
    selection: before.selection,
    moves: before.moves,
    elapsedMs: Number(before.elapsedMs) + 700,
    started: before.started,
  });
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 1,
    boardCode: before.boardCode,
    selection: before.selection,
    moves: before.moves,
  });
});

test('completed named imports stay static, do not change best, and can be renamed', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(800);
  await finishBoard(page);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');

  const completed = {
    version: 2,
    name: 'Finished Café',
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: SelectionKind.closed },
    moves: 8,
    elapsedMs: 1200,
    started: true,
  };
  await page.locator('summary').click();
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(completed));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Finished Café');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);

  await name.fill('Finished again');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const exported: unknown = JSON.parse(
    await page.getByLabel(ReproductionControl.snapshot, { exact: true }).inputValue(),
  );
  expect(exported).toMatchObject({ version: 2, name: 'Finished again', moves: 8 });
});

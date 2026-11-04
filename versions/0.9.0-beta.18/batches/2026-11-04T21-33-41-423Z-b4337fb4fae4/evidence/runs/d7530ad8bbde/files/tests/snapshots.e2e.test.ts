import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { uiSnapshot } from './ui-snapshot.ts';

const REMAINING_MS = 300;

async function loadDraft(
  page: Parameters<typeof loadTimedBoard>[0],
  snapshot: unknown,
): Promise<void> {
  await page.locator('summary').click();
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await page.locator('summary').click();
}

async function readCurrentExport(
  page: Parameters<typeof loadTimedBoard>[0],
): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(
    await page.getByLabel(ReproductionControl.snapshot, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported snapshot object.');
  return value;
}

test('Resume focuses the remembered card before removal and continues the exact remaining interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const snapshot = {
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    moves: 1,
    elapsedMs: 500,
    started: true,
    selection: { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: REMAINING_MS },
  };
  await loadDraft(page, snapshot);
  await page.locator('.card').nth(2).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(2000);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(snapshot.elapsedMs);
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(REMAINING_MS - 1);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('invalid drafts keep the current game and a loaded win changes neither best nor celebration', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1200);
  const original = await exportedSnapshot(page);
  await page.locator('summary').click();
  const code = page.getByLabel(ReproductionControl.board, { exact: true });
  const invalidCode = 'invalid';
  await code.fill(invalidCode);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  expect(await code.inputValue()).toBe(invalidCode);
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const invalidSnapshot = '{';
  await field.fill(invalidSnapshot);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  expect(await field.inputValue()).toBe(invalidSnapshot);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(original);
  await loadDraft(page, {
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: SelectionKind.closed },
    moves: EXAMPLE_PAIRS.length,
    elapsedMs: 500,
    started: true,
  });
  await expect(page.locator('.card.matched')).toHaveCount(16);
  expect(await page.locator('.victory.celebrate').count()).toBe(0);
  const expected = await uiSnapshot();
  await expect(page.locator('.stats dd').nth(3)).toHaveText(expected.bestNone);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await page.clock.runFor(1000);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(500);
  await expect(page.locator('.card.matched')).toHaveCount(16);
  expect(await page.locator('.victory.celebrate').count()).toBe(0);
});

test('deal names round trip through version two snapshots and clear on unnamed imports and resets', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill(' Café ');
  await page.locator('.card').nth(0).click();
  const exportButton = page.getByRole('button', {
    name: ReproductionControl.exportSnapshot,
    exact: true,
  });
  await exportButton.click();
  const snapshot = await readCurrentExport(page);
  expect(snapshot).toMatchObject({
    version: 2,
    name: ' Café ',
    selection: { kind: 'one', index: 0 },
  });

  // Reordering object properties models valid JSON pasted from another exporter.
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(snapshot).reverse()));
  const snapshotField = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await snapshotField.fill(reordered);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue(' Café ');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();

  await exportButton.click();
  const saved = await readCurrentExport(page);
  const unnamed = Object.fromEntries(Object.entries(saved).filter(([key]) => key !== 'name'));
  unnamed.version = SNAPSHOT_VERSION;
  await snapshotField.fill(JSON.stringify(unnamed));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');

  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue('');

  await name.fill('New deal');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');

  await name.fill('Changed size');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');

  await name.fill('Loaded board');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
});

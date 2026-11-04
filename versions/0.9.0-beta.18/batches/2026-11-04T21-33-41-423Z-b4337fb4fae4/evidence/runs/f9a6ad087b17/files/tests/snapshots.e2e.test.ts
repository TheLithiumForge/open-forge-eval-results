import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { uiSnapshot } from './ui-snapshot.ts';

const REMAINING_MS = 300;

test('deal names export as version 2, restore on import and clear for unnamed progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const name = page.getByLabel('Deal name', { exact: true });
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill(' Café ');
  await page.locator('summary').click();
  await page.locator('.card').nth(2).click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({ version: 2, name: ' Café ', selection: { kind: 'one', index: 2 } });

  await page.locator('summary').click();
  const pasted = {
    started: true,
    elapsedMs: 0,
    moves: 0,
    selection: { kind: 'one', index: 2 },
    matched: [],
    boardCode: EXAMPLE_CODE,
    name: ' Café ',
    version: 2,
  };
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await field.fill(JSON.stringify(pasted));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue(' Café ');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: ' Café ' });

  await page.locator('summary').click();
  await field.fill(
    JSON.stringify({
      version: 1,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Temporary');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Temporary');
  const boardCode = page.getByLabel(ReproductionControl.board, { exact: true });
  await boardCode.fill('np1-6-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Temporary');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
});

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

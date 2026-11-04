import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

async function openReproduction(page: Parameters<typeof loadTimedBoard>[0]): Promise<void> {
  const details = page.locator('details');
  if (!(await details.evaluate((element) => element instanceof HTMLDetailsElement && element.open)))
    await details.locator('summary').click();
}

async function loadSnapshotDraft(
  page: Parameters<typeof loadTimedBoard>[0],
  text: string,
): Promise<void> {
  await openReproduction(page);
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await page.locator('details').locator('summary').click();
}

const UNFINISHED_V1 = {
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.one, index: 0 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('renaming keeps play state and clock while named progress survives import and resume', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1200);
  const before = await exportedSnapshot(page);

  await openReproduction(page);
  const labeledName = page.getByRole('textbox', { name: 'Deal name', exact: true });
  const name = page.locator('#deal-name');
  await expect(labeledName).toHaveValue('');
  await expect(labeledName).toHaveAttribute('maxlength', '40');
  await labeledName.fill('😀'.repeat(21));
  await expect(labeledName).toHaveValue('😀'.repeat(20));
  await name.fill('  Café 😀  ');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({
    ...before,
    version: 2,
    name: '  Café 😀  ',
  });
  expect(saved.boardCode).toBe(before.boardCode);
  expect(saved.matched).toEqual(before.matched);
  expect(saved.selection).toEqual(before.selection);
  expect(saved.moves).toBe(before.moves);
  expect(saved.elapsedMs).toBe(before.elapsedMs);
  if (typeof saved.elapsedMs !== 'number') throw new Error('Expected whole saved elapsed time.');

  await loadSnapshotDraft(page, JSON.stringify(saved));
  await openReproduction(page);
  await expect(name).toHaveValue('  Café 😀  ');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.locator('summary').click();
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.clock.runFor(1200);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(saved.elapsedMs);
  await openReproduction(page);
  await name.fill('paused name');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'paused name' });
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.clock.runFor(1200);
  expect((await exportedSnapshot(page)).elapsedMs).toBeGreaterThan(saved.elapsedMs);
});

test('imports reordered named JSON, rejects bad names without replacing progress, and clears on v1', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await openReproduction(page);
  const reordered = JSON.stringify({
    selection: { index: 0, kind: SelectionKind.one },
    started: true,
    elapsedMs: 0,
    moves: 0,
    matched: [],
    boardCode: EXAMPLE_CODE,
    name: ' prior ',
    version: 2,
  });
  await loadSnapshotDraft(page, reordered);
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue(' prior ');

  const badName = JSON.stringify({ ...UNFINISHED_V1, version: 2, name: 'bad\nname' });
  await loadSnapshotDraft(page, badName);
  await expect(name).toHaveValue(' prior ');
  await expect(page.getByLabel(ReproductionControl.snapshot, { exact: true })).toHaveValue(badName);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: ' prior ' });

  await loadSnapshotDraft(page, JSON.stringify({ ...UNFINISHED_V1, version: 1 }));
  await expect(name).toHaveValue('');
  await expect(page.locator('.card.revealed')).toHaveCount(1);

  await openReproduction(page);
  await name.fill('again');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'again' });
  await openReproduction(page);
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 1 });
});

test('completed named progress can be renamed and exported without a pause or celebration', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  const completed = JSON.stringify({
    version: 2,
    name: 'won',
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: SelectionKind.closed },
    moves: EXAMPLE_PAIRS.length,
    elapsedMs: 500,
    started: true,
  });
  await loadSnapshotDraft(page, completed);
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue('won');
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  const bestBefore = await page.locator('.stats > div').nth(3).innerText();
  await openReproduction(page);
  await name.fill(' finished ');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: ' finished ',
    matched: Array.from({ length: 16 }, (_, index) => index),
    moves: EXAMPLE_PAIRS.length,
    elapsedMs: 500,
  });
  await expect(page.locator('.stats > div').nth(3)).toHaveText(bestBefore);
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
});

test('fresh deals clear the name and browser preferences never save it', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await openReproduction(page);
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await name.fill('temporary');
  const preferences = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  expect(preferences).not.toContain('temporary');
  await page.reload();
  await openReproduction(page);
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('4');

  for (const action of [DealControl.newGame, DealControl.restart]) {
    await name.fill('temporary');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('temporary');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(36);

  await name.fill('temporary');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  expect(
    await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1')),
  ).not.toContain('temporary');
  await page.reload();
  await openReproduction(page);
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('4');
});

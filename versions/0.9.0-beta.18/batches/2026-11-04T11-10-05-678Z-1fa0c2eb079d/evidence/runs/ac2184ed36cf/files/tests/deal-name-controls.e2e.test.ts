import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('Deal name exports both formats and edits the active turn without changing drafts', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  const board = page.getByLabel(ReproductionControl.board, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café 🎴  ');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: '  Café 🎴  ' });

  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(Object.hasOwn(unnamed, 'name')).toBe(false);

  await page.locator('summary').click();
  await name.fill('first name');
  await board.fill('board draft');
  await snapshot.fill('snapshot draft');
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(400);
  const beforeMoves = await page.locator('.stats dd').nth(0).textContent();
  await name.fill('renamed');
  await expect(board).toHaveValue('board draft');
  await expect(snapshot).toHaveValue('snapshot draft');
  await expect(page.locator('.stats dd').nth(0)).toHaveText(beforeMoves ?? '');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(399);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('fresh deals, board loads, version 1 imports and reload clear the name', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  const board = page.getByLabel(ReproductionControl.board, { exact: true });
  await name.fill('size');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('restart');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('new deal');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('board load');
  await board.fill('np1-4-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('legacy');
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(
    JSON.stringify({
      boardCode: 'np1-4-1',
      matched: [],
      selection: { kind: 'one', index: 0 },
      moves: 0,
      elapsedMs: 0,
      started: true,
      version: 1,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('4');
  await name.fill('reload must clear this');
  await page.reload();
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('4');
  await expect(page.locator('.card')).toHaveCount(16);
  await page.locator('summary').click();
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue('');
});

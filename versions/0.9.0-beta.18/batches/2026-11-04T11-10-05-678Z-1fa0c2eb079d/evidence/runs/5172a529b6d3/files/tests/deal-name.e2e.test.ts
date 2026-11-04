import { expect, test } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('Deal name input preserves its text and does not change an active mismatch', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveValue('');
  await name.fill('😀'.repeat(20));
  await name.pressSequentially('😀');
  await expect(name).toHaveValue('😀'.repeat(20));
  const savedName = '  Café 😀  ';
  await name.fill(savedName);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  await page.locator('summary').click();
  const beforeRename = await exportedSnapshot(page);
  expect(beforeRename).toMatchObject({
    version: 2,
    name: savedName,
    boardCode: EXAMPLE_CODE,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 600 },
    moves: 1,
    elapsedMs: 200,
  });

  await page.locator('summary').click();
  const renamed = '  renamed 🧠  ';
  await name.fill(renamed);
  await page.locator('summary').click();
  const afterRename = await exportedSnapshot(page);
  expect(afterRename).toMatchObject({ ...beforeRename, name: renamed });
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);

  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(Object.hasOwn(unnamed, 'name')).toBe(false);
});

test('New Game, Restart, size and board loads clear the name', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill(label);
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('size change');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(36);
  const board = page.getByLabel(ReproductionControl.board, { exact: true });
  await name.fill('board load');
  await board.fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(16);
});

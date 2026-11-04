import { expect, test } from './browser-test.ts';
import { exportedSnapshot, finishBoard, loadTimedBoard } from './game-fixture.ts';

test('fresh deals and unnamed imports clear names and reload never restores a name from preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const board = page.getByLabel('Board code', { exact: true });
  const loadBoard = page.getByRole('button', { name: 'Load board', exact: true });
  for (const label of ['New Game', 'Restart', 'Load board']) {
    await name.fill('My game');
    if (label === 'Load board') await board.fill('np1-6-1');
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(name).toHaveValue('');
  }
  await name.fill('Another name');
  await page.getByLabel('Grid size', { exact: true }).selectOption('8');
  await expect(name).toHaveValue('');
  await name.fill('Keep on failure');
  await board.fill('invalid');
  await loadBoard.click();
  await expect(name).toHaveValue('Keep on failure');
  // This unnamed pasted save deliberately puts version last.
  const unnamed = {
    selection: { index: 2, kind: 'one' },
    matched: [],
    moves: 0,
    elapsedMs: 0,
    started: true,
    boardCode: 'np1-4-1',
    version: 1,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(unnamed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(unnamed);
  await page.locator('summary').click();
  await name.fill('Never stored');
  const stored = await page.evaluate(() => Object.values(localStorage).join(' '));
  expect(stored).not.toContain('Never stored');
  await page.reload();
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
});

test('completed named imports stay static, allow renaming and preserve the saved best', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(800);
  await finishBoard(page);
  await page.clock.runFor(600);
  const completed = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Finished game');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, version: 2, name: 'Finished game' });
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await page.locator('summary').click();
  const imported = { ...completed, version: 2, name: 'Named win', moves: 8, elapsedMs: 3000 };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(imported));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('Named win');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await name.fill('  Renamed win  ');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...imported, name: '  Renamed win  ' });
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, moves: 8, elapsedMs: 3000 });
});

test('finishing an unfinished named import records a best after Resume', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    JSON.stringify({
      version: 2,
      name: 'Finish me',
      boardCode: 'np1-4-1',
      matched: [],
      selection: { kind: 'one', index: 2 },
      moves: 0,
      elapsedMs: 1000,
      started: true,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await finishBoard(page);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Finish me', moves: 8 });
  await page.reload();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
});

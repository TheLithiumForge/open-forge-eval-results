import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { pasteSnapshot, readNamedSnapshot } from './named-snapshot-fixture.ts';

test('new restart size board loads and reload clear the name without saving it in preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Clear this name');
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(name).toHaveValue('');
  }
  await name.fill('Before size change');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Before board load');
  await page.getByLabel('Board code', { exact: true }).fill('np1-8-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await name.fill('Do not persist this name');
  const preferences = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  expect(JSON.parse(preferences ?? 'null')).toEqual({ schemaVersion: 1, size: 8, bestMoves: {} });
  await page.reload();
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.locator('.card.closed')).toHaveCount(64);
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  expect(await readNamedSnapshot(page)).toMatchObject({ version: 1, moves: 0, started: false });
});

test('completed named imports stay static and a resumed named game can earn a saved best', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  const completed = {
    version: 2,
    name: 'Completed Café',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 5500,
    started: true,
  };
  await pasteSnapshot(page, JSON.stringify(completed));
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue(completed.name);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.getByLabel('Deal name', { exact: true }).fill('Renamed completed Café');
  await page.clock.runFor(2000);
  expect(await readNamedSnapshot(page)).toEqual({ ...completed, name: 'Renamed completed Café' });
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  const unfinished = {
    ...completed,
    name: 'Ready to finish',
    matched: [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15],
    moves: 7,
  };
  await pasteSnapshot(page, JSON.stringify(unfinished));
  await page.getByLabel('Deal name', { exact: true }).fill('Finished Café');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of [3, 7]) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  expect(await readNamedSnapshot(page)).toMatchObject({ name: 'Finished Café', moves: 8 });
  await page.reload();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
});

import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('fresh deals clear names and browser preferences never retain them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.pressSequentially('a'.repeat(41));
  await expect(name).toHaveValue('a'.repeat(40));
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Clear this name');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Clear on resize');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Clear on board load');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    JSON.stringify({
      name: 'Do not store this name',
      version: 2,
      boardCode: 'np1-6-1',
      matched: [],
      selection: { kind: 'one', index: 5 },
      moves: 0,
      elapsedMs: 500,
      started: true,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('Do not store this name');
  await name.fill('Nor this edit');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), PREFERENCES_KEY),
  ).toEqual({
    schemaVersion: 1,
    size: 6,
    bestMoves: {},
  });
  await page.reload();
  await expect(page.locator('.card')).toHaveCount(36);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({ version: 1, started: false, elapsedMs: 0 });
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

test('invalid named imports retain the current name, paused progress and entered drafts', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const original = {
    name: 'Keep Café',
    boardCode: 'np1-4-1',
    matched: [2, 6],
    selection: { index: 0, kind: 'one' },
    moves: 1,
    elapsedMs: 1234,
    started: true,
    version: 2,
  };
  const name = page.getByLabel('Deal name', { exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(original));
  await load.click();
  const code = page.getByLabel('Board code', { exact: true });
  await code.fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue(original.name);
  await expect(code).toHaveValue('invalid');
  for (const overrides of [
    { name: '' },
    { name: 'a'.repeat(41) },
    { name: 'line\nbreak' },
    { name: 'line\rbreak' },
    { version: 1 },
    { version: 3 },
    { extra: true },
    { moves: 0 },
  ]) {
    const draft = JSON.stringify({ ...original, ...overrides });
    await field.fill(draft);
    await load.click();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue(original.name);
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  }
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(original);
});

import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('fresh-deal actions and legacy imports clear names while reload stores only preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Reset this name');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Resize this name');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Load another board');
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Replace with legacy');
  const legacy = {
    version: 1,
    boardCode: 'np1-6-1',
    matched: [],
    selection: { kind: 'one', index: 5 },
    moves: 0,
    elapsedMs: 100,
    started: true,
  };
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(legacy));
  await load.click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
  await page.locator('summary').click();
  await field.fill(JSON.stringify({ ...legacy, version: 2, name: 'Reload unnamed' }));
  await load.click();
  await expect(name).toHaveValue('Reload unnamed');
  const stored = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  const preferences: unknown = JSON.parse(stored ?? 'null');
  expect(preferences).toEqual({ schemaVersion: 1, size: 6, bestMoves: {} });
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 1,
    matched: [],
    moves: 0,
    elapsedMs: 0,
    started: false,
    selection: { kind: 'closed' },
  });
});

test('invalid board and named snapshot drafts preserve the current name and progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('  Keep Café 😀  ');
  await page.locator('summary').click();
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('invalid board');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(board).toHaveValue('invalid board');
  await expect(name).toHaveValue('  Keep Café 😀  ');
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  for (const invalid of [
    { ...before, name: '' },
    { ...before, name: 'invalid\nname' },
    { ...before, name: 'a'.repeat(41) },
    { ...before, version: 1 },
    { ...before, extra: true },
  ]) {
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('  Keep Café 😀  ');
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  }
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(before);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
});

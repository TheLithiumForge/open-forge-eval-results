import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('editing a deal name preserves play, the board-code draft and the active mismatch clock', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(page.locator('details').getByLabel('Deal name', { exact: true })).toBeVisible();
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveValue('');
  await name.fill('x'.repeat(40));
  await name.press('End');
  await name.pressSequentially('y');
  await expect(name).toHaveValue('x'.repeat(40));
  await name.fill('  Café 🃏  ');
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('keep this draft');
  await page.locator('summary').click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const before = await exportedSnapshot(page);
  expect(before).toEqual({
    version: 2,
    name: '  Café 🃏  ',
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 600 },
    moves: 1,
    elapsedMs: 200,
    started: true,
  });
  await page.locator('summary').click();
  await name.fill('  renamed  ');
  await expect(name).toBeFocused();
  await expect(board).toHaveValue('keep this draft');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...before, name: '  renamed  ' });
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const cleared = await exportedSnapshot(page);
  expect(cleared).toEqual({
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 1,
    elapsedMs: 800,
    started: true,
  });
});

test('deal changes clear the name and browser preferences never save it', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Café');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
    await expect(page.getByRole('button', { name: label, exact: true })).toBeFocused();
  }
  await name.fill('Café');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Café');
  await page.getByLabel('Board code', { exact: true }).fill('np1-8-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Café');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    JSON.stringify({ schemaVersion: 1, size: 8, bestMoves: {} }),
  );
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  expect(
    JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue()),
  ).toMatchObject({
    version: 1,
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});

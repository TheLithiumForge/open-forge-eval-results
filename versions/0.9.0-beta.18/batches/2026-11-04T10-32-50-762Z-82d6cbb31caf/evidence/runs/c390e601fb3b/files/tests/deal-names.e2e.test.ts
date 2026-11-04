import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('editing and clearing a name preserve running progress and the pending mismatch', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(100);
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(125);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await page.getByLabel('Board code', { exact: true }).fill('draft code');
  await name.fill('  Café 😀  ');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...before, version: 2, name: '  Café 😀  ' });
  await page.clock.runFor(674);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.locator('summary').click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft code');
  await expect(name).toHaveValue('  Café 😀  ');
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    ...before,
    elapsedMs: 900,
    selection: { kind: 'closed' },
  });
});

test('named imports restore paused progress, allow renaming and resume its exact remaining time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const snapshot = {
    name: 'Café',
    boardCode: 'np1-4-1',
    matched: [0, 11],
    selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
    moves: 2,
    elapsedMs: 1500,
    started: true,
    version: 2,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(snapshot));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Café');
  await name.fill('  renamed  ');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  await page.locator('.card').nth(3).click();
  expect(await exportedSnapshot(page)).toEqual({ ...snapshot, name: '  renamed  ' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toEqual({
    ...snapshot,
    name: '  renamed  ',
    elapsedMs: 1800,
    selection: { kind: 'closed' },
  });
});

test('new deals and legacy imports clear names and preferences never persist them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const action of ['Restart', 'New Game', 'size', 'board', 'legacy', 'reload']) {
    await name.fill('temporary name');
    if (action === 'size') await page.getByLabel('Grid size', { exact: true }).selectOption('6');
    else if (action === 'board') {
      await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
      await page.getByRole('button', { name: 'Load board', exact: true }).click();
    } else if (action === 'legacy') {
      await page.getByLabel('Snapshot JSON', { exact: true }).fill(
        JSON.stringify({
          boardCode: 'np1-4-1',
          matched: [],
          selection: { kind: 'closed' },
          moves: 0,
          elapsedMs: 0,
          started: false,
          version: 1,
        }),
      );
      await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    } else if (action === 'reload') {
      const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
      expect(preferences).toBe(JSON.stringify({ schemaVersion: 1, size: 4, bestMoves: {} }));
      await page.reload();
      await page.locator('summary').click();
    } else await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
    await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
    const exported: unknown = JSON.parse(
      await page.getByLabel('Snapshot JSON', { exact: true }).inputValue(),
    );
    expect(exported).toMatchObject({ version: 1 });
    expect(exported).not.toHaveProperty('name');
  }
});

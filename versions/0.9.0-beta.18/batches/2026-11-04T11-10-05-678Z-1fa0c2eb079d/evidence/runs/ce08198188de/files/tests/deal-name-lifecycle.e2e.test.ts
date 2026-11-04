import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('session resets and legacy imports clear deal names and retain unnamed exports', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Clear on ' + label);
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(name).toHaveValue('');
  }
  await name.fill('Clear on resize');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Clear on board');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Clear on legacy');
  const legacy = {
    boardCode: 'np1-4-1',
    matched: [],
    selection: { index: 2, kind: 'one' },
    moves: 0,
    elapsedMs: 25,
    started: true,
    version: 1,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(legacy));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
});

test('named imports keep completed wins static and resumed wins record local bests', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const completed = {
    name: 'Imported win',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    version: 2,
  };
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  await draft.fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Imported win');
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.getByLabel('Deal name', { exact: true }).fill('Edited win');
  await page.clock.runFor(2000);
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, name: 'Edited win' });
  await page.locator('summary').click();
  await draft.fill(
    JSON.stringify({
      ...completed,
      name: 'Finish me',
      matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
      moves: 7,
      elapsedMs: 1000,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(1).click();
  await page.locator('.card').nth(9).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Finish me');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
});

test('names stay out of browser preferences and reload starts an unnamed fresh deal', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await page.getByLabel('Deal name', { exact: true }).fill('Private session title');
  const saved = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(saved && JSON.parse(saved)).toEqual({ schemaVersion: 1, size: 6, bestMoves: {} });
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  const fresh = await exportedSnapshot(page);
  expect(fresh).toMatchObject({ version: 1, moves: 0, elapsedMs: 0, started: false });
  expect(fresh).not.toHaveProperty('name');
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
});

import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('new deals, Restart, size changes, board loads and reload clear names without storing them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Temporary name');
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(name).toHaveValue('');
  }
  await name.fill('Temporary name');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Temporary name');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Not a preference');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    '{"schemaVersion":1,"size":4,"bestMoves":{}}',
  );
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 1,
    matched: [],
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});

test('a completed named import can be renamed without a pause, celebration or best-score write', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, '{"schemaVersion":1,"size":4,"bestMoves":{"4":10}}'),
    PREFERENCES_KEY,
  );
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const saved = {
    matched: EXAMPLE_PAIRS.flat().sort((left, right) => left - right),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    boardCode: 'np1-4-1',
    name: 'Completed Café',
    version: 2,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(saved));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue(saved.name);
  await name.fill('  Finished 😀  ');
  await expect(name).toBeFocused();
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.stats dd').nth(3)).toHaveText('10');
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual({ ...saved, name: '  Finished 😀  ' });
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    '{"schemaVersion":1,"size":4,"bestMoves":{"4":10}}',
  );
});

test('winning after resuming and renaming an unfinished named import records its local best', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    JSON.stringify({
      version: 2,
      name: 'Nearly there',
      boardCode: 'np1-4-1',
      matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
      selection: { kind: 'closed' },
      moves: 7,
      elapsedMs: 1000,
      started: true,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await page.getByLabel('Deal name', { exact: true }).fill('My finish');
  await page.locator('summary').click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const finalPair = EXAMPLE_PAIRS.at(-1);
  if (!finalPair) throw new Error('Missing final pair.');
  for (const index of finalPair) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.victory.celebrate')).toBeVisible();
  expect(await exportedSnapshot(page)).toMatchObject({ name: 'My finish', version: 2, moves: 8 });
  await page.reload();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  expect(await exportedSnapshot(page)).not.toHaveProperty('name');
});

import { expect, test } from './browser-test.ts';
import { ReproductionControl, DealControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { loadTimedBoard } from './game-fixture.ts';

const NAME = 'ephemeral save label';

test('invalid pasted progress stays editable and reordered v1 progress clears its name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await name.fill(NAME);
  const invalid = JSON.stringify({
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    name: 'otherwise valid name',
    extra: true,
    version: 2,
  });
  await snapshot.fill(invalid);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(snapshot).toHaveValue(invalid);
  await expect(name).toHaveValue(NAME);
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');

  const pasted = JSON.stringify({
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'one', index: 0 },
    moves: 0,
    elapsedMs: 0,
    started: true,
    version: 1,
  });
  await snapshot.fill(pasted);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
});

test('new deals, restart, size change, board load and reload clear the deal name', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const newGame = page.getByRole('button', { name: DealControl.newGame, exact: true });
  const restart = page.getByRole('button', { name: DealControl.restart, exact: true });
  const size = page.getByLabel(DealControl.size, { exact: true });
  const board = page.getByLabel(ReproductionControl.board, { exact: true });

  await name.fill(NAME);
  await newGame.click();
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await restart.click();
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await size.selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await board.fill('np1-4-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(board).toHaveValue('np1-4-1');

  await name.fill(NAME);
  const stored = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  const preferences: unknown = stored ? JSON.parse(stored) : null;
  if (!isJsonObject(preferences)) throw new Error('Expected stored browser preferences.');
  expect(Object.keys(preferences).sort()).toEqual(['bestMoves', 'schemaVersion', 'size']);
  expect(preferences.schemaVersion).toBe(1);
  expect(preferences.size).toBe(4);
  expect(preferences.bestMoves).toEqual({});
  expect(preferences).not.toHaveProperty('name');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
});

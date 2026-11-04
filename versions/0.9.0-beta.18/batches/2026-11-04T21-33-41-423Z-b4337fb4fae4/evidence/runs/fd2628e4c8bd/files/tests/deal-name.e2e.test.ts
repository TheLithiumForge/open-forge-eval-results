import { expect, test } from './browser-test.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('names survive export and import without changing progress or paused time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const save = page.getByRole('button', { name: 'Export snapshot', exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café 🎮  ');
  await save.click();
  const saved = JSON.parse(await draft.inputValue());
  expect(saved).toMatchObject({
    version: 2,
    name: '  Café 🎮  ',
    moves: 1,
    elapsedMs: 200,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 600 },
  });
  await name.fill('different');
  // A valid save with version last can come from another JSON serializer.
  const { version, ...fields } = saved;
  await draft.fill(JSON.stringify({ ...fields, version }));
  await load.click();
  await expect(name).toHaveValue('  Café 🎮  ');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await name.fill('paused');
  await page.clock.runFor(1000);
  await save.click();
  expect(JSON.parse(await draft.inputValue())).toMatchObject({
    name: 'paused',
    elapsedMs: 200,
    selection: { remainingMs: 600 },
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(600);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await name.fill('');
  await save.click();
  expect(JSON.parse(await draft.inputValue())).toMatchObject({ version: 1 });
  expect(JSON.parse(await draft.inputValue())).not.toHaveProperty('name');
});

test('deal replacement clears names and completed imports stay static', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const board = page.getByLabel('Board code', { exact: true });
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  for (const action of ['New Game', 'Restart']) {
    await name.fill('temporary');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('temporary');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await board.fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  const completed = {
    boardCode: 'np1-4-1',
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 500,
    started: true,
    name: 'Finished',
    version: 2,
  };
  await draft.fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('Finished');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('renamed');
  await draft.fill(JSON.stringify({ ...completed, name: '', version: 2 }));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('renamed');
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  const { name: _name, ...v1 } = completed;
  await draft.fill(JSON.stringify({ ...v1, version: 1 }));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('not persisted');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

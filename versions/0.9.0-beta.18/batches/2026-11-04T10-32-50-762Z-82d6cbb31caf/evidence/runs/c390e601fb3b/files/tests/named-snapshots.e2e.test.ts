import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';

const COMPLETED = {
  boardCode: 'np1-4-1',
  matched: Array.from({ length: 16 }, (_, index) => index),
  selection: { kind: 'closed' },
  moves: 8,
  elapsedMs: 3000,
  started: true,
  name: 'Completed Café',
  version: 2,
};

test('completed named imports stay static when renamed and unfinished named wins record bests', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  await draft.fill(JSON.stringify(COMPLETED));
  await load.click();
  await expect(name).toHaveValue('Completed Café');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await name.fill('renamed win');
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...COMPLETED, name: 'renamed win' });
  await page.locator('summary').click();
  const unfinished = { ...COMPLETED, matched: EXAMPLE_PAIRS.slice(1).flat(), moves: 7 };
  await draft.fill(JSON.stringify(unfinished));
  await load.click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of EXAMPLE_PAIRS[0]) await page.locator('.card').nth(index).click();
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(name).toHaveValue('Completed Café');
});

test('invalid named drafts preserve the active deal, name, pause and saved size', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  const original = {
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'one', index: 0 },
    moves: 0,
    elapsedMs: 500,
    started: true,
    name: 'keep me',
    version: 2,
  };
  await draft.fill(JSON.stringify(original));
  await load.click();
  const { name, ...missingName } = original;
  expect(name).toBe('keep me');
  for (const invalid of [
    { ...missingName, boardCode: 'np1-6-1' },
    { ...original, boardCode: 'np1-6-1', name: '' },
    { ...original, name: 42 },
    { ...original, name: 'a\rb' },
    { ...original, name: 'a\nb' },
    { ...original, name: '😀'.repeat(20) + 'x' },
    { ...original, name: 'valid', extra: true },
    { ...original, version: 1 },
  ]) {
    const text = JSON.stringify(invalid);
    await draft.fill(text);
    await load.click();
    await expect(draft).toHaveValue(text);
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('keep me');
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  }
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(original);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
});

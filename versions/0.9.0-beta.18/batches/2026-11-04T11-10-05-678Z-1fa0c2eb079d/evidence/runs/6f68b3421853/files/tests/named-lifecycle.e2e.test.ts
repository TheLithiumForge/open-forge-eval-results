import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('new deals, restarts, size changes and board loads clear the current deal name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Remember me');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Before size');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Before board');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  const snapshot = await exportedSnapshot(page);
  expect(snapshot).toMatchObject({ version: 1, boardCode: 'np1-4-1', started: false });
  expect(snapshot).not.toHaveProperty('name');
});

test('completed named imports stay static, keep best scores and allow renaming and clearing', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const snapshot = {
    version: 2,
    name: 'Finished',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 5000,
    started: true,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Finished');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await name.fill('  Finished Café  ');
  await page.clock.runFor(2000);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...snapshot, name: '  Finished Café  ' });
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const cleared = await exportedSnapshot(page);
  expect(cleared).toMatchObject({ version: 1, moves: 8, elapsedMs: 5000 });
  expect(cleared).not.toHaveProperty('name');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
});

test('names stay out of preferences and a reload starts an unnamed fresh deal at the saved size', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  const saved = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('Private deal');
  await page.locator('summary').click();
  await page.locator('.card').first().click();
  expect((await exportedSnapshot(page)).name).toBe('Private deal');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(saved);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 1,
    moves: 0,
    elapsedMs: 0,
    started: false,
    matched: [],
    selection: { kind: 'closed' },
  });
});

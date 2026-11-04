import { expect, test } from './browser-test.ts';
import { exportedSnapshot, finishBoard, loadTimedBoard } from './game-fixture.ts';

test('clearing a name and importing reordered legacy progress export unnamed snapshots', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('a'.repeat(41));
  await expect(name).toHaveValue('a'.repeat(40));
  await name.fill('🎲'.repeat(20));
  await name.press('End');
  await name.press('x');
  await expect(name).toHaveValue('🎲'.repeat(20));
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
  await page.locator('summary').click();
  await name.fill('replace this name');
  const legacy = {
    selection: { index: 2, kind: 'one' },
    elapsedMs: 1200,
    started: true,
    matched: [],
    moves: 0,
    boardCode: 'np1-4-1',
    version: 1,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(legacy));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
});

test('fresh deals, restarting, size changes and board loads clear names without saving them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill(`before ${label}`);
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(name).toHaveValue('');
  }
  await name.fill('before size change');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('before board load');
  await page.getByLabel('Board code', { exact: true }).fill('np1-8-1');
  const load = page.getByRole('button', { name: 'Load board', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('');
  await name.fill('only in memory');
  const stored = await page.evaluate(() => Object.values(localStorage));
  expect(stored.join('')).not.toContain('only in memory');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 1,
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});

test('named completed imports stay static and preserve best scores when renamed', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(800);
  await finishBoard(page);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await page.locator('summary').click();
  const completed = {
    name: 'Café finished',
    boardCode: 'np1-4-1',
    selection: { kind: 'closed' },
    matched: Array.from({ length: 16 }, (_, index) => index),
    moves: 8,
    elapsedMs: 3500,
    started: true,
    version: 2,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue(completed.name);
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await name.fill('  Renamed after completion  ');
  await page.clock.runFor(2000);
  await expect(name).toBeFocused();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    ...completed,
    name: '  Renamed after completion  ',
  });
});

test('resuming named unfinished progress records a best when its final pair is found', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    JSON.stringify({
      version: 2,
      name: 'Last pair',
      boardCode: 'np1-4-1',
      matched: Array.from({ length: 16 }, (_, index) => index).filter(
        (index) => index !== 12 && index !== 13,
      ),
      selection: { kind: 'one', index: 12 },
      moves: 7,
      elapsedMs: 2000,
      started: true,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(13).click();
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Last pair');
});

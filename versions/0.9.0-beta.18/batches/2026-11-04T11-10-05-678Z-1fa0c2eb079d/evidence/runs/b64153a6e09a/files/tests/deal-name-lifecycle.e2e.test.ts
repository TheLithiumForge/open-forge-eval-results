import { expect, test } from './browser-test.ts';
import { exportedSnapshot, finishBoard, loadTimedBoard } from './game-fixture.ts';

test('new deals, restart, board loads, size changes and reload clear names without saving them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const field = page.getByLabel('Deal name', { exact: true });
  for (const action of ['New Game', 'Restart', 'Load board', 'Grid size']) {
    await field.fill('A name that stays out of preferences');
    if (action === 'Grid size')
      await page.getByRole('combobox', { name: action, exact: true }).selectOption('6');
    else {
      if (action === 'Load board')
        await page.getByLabel('Board code', { exact: true }).fill('np1-4-2');
      await page.getByRole('button', { name: action, exact: true }).click();
    }
    await expect(field).toHaveValue('');
    await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
    expect(
      JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue()),
    ).toMatchObject({ version: 1, started: false, moves: 0, elapsedMs: 0 });
  }
  await field.fill('A name that stays out of preferences');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'A name that stays out of preferences',
  );
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('6');
  await expect(page.locator('.card')).toHaveCount(36);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  await expect(field).toHaveValue('');
});

test('completed named imports stay static and renamable while resumed wins still record bests', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(800);
  await finishBoard(page);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await page.locator('summary').click();
  const field = page.getByLabel('Deal name', { exact: true });
  await field.fill('Already completed');
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const completed = {
    boardCode: 'np1-4-1',
    name: 'Saved winner',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 1000,
    started: true,
    version: 2,
  };
  await draft.fill(JSON.stringify(completed));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(field).toHaveValue('Saved winner');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await field.fill('Renamed winner');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, name: 'Renamed winner' });
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  await page.locator('summary').click();
  await draft.fill(
    JSON.stringify({
      ...completed,
      matched: completed.matched.filter((index) => index !== 2 && index !== 6),
      selection: { kind: 'one', index: 2 },
      moves: 7,
      name: 'Finish this one',
    }),
  );
  await load.click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(6).click();
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(field).toHaveValue('Finish this one');
});

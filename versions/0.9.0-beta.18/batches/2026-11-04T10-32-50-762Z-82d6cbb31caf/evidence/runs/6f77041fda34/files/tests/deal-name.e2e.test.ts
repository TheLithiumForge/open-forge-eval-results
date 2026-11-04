import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('naming and clearing a running deal preserve progress and named imports resume their saved interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const original = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('keep this draft');
  await name.fill('  Café 🃏  ');
  await expect(board).toHaveValue('keep this draft');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toEqual({ ...original, version: 2, name: '  Café 🃏  ' });
  await page.clock.runFor(100);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: '  Café 🃏  ',
    elapsedMs: 300,
    selection: { kind: 'mismatch', remainingMs: 500 },
  });
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    ...original,
    elapsedMs: 300,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 500 },
  });
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  // Pasting another tool's JSON may put version last.
  await field.fill(JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('  Café 🃏  ');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await name.fill('Renamed while paused');
  await page.locator('summary').click();
  await page.locator('.card').nth(3).click();
  await page.keyboard.press('Enter');
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual({ ...saved, name: 'Renamed while paused' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.locator('summary').click();
  await field.fill(JSON.stringify(Object.fromEntries(Object.entries(original).reverse())));
  await load.click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(original);
});

test('completed named imports stay static and finishing resumed named progress still records a best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const completed = {
    name: 'Completed Café',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 2000,
    started: true,
    version: 2,
  };
  await field.fill(JSON.stringify(completed));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(name).toHaveValue('Completed Café');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await name.fill('Renamed completed deal');
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, name: 'Renamed completed deal' });
  await page.locator('summary').click();
  await field.fill(
    JSON.stringify({
      ...completed,
      matched: completed.matched.filter((index) => index !== 12 && index !== 13),
      moves: 7,
    }),
  );
  await load.click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(12).click();
  await page.locator('.card').nth(13).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  await expect(name).toHaveValue('Completed Café');
});

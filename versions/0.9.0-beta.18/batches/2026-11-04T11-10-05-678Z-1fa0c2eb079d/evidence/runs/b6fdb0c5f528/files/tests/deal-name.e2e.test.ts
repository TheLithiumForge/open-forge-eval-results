import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('the native Deal name control preserves spaces and limits names by UTF-16 units', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('🎮'.repeat(20));
  await name.press('End');
  await name.press('a');
  await expect(name).toHaveValue('🎮'.repeat(20));
  await name.fill('  Café 🎮  ');
  await expect(name).toBeFocused();
  await page.locator('summary').click();
  const named = await exportedSnapshot(page);
  expect(named).toMatchObject({ version: 2, name: '  Café 🎮  ' });
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  const { name: savedName, ...progress } = named;
  expect(savedName).toBe('  Café 🎮  ');
  expect(unnamed).toEqual({ ...progress, version: 1 });
});

test('editing a name during a mismatch preserves progress, drafts and its original deadline', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  const before = await exportedSnapshot(page);
  await page.clock.runFor(123);
  await page.locator('summary').click();
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('draft kept');
  await page.getByLabel('Deal name', { exact: true }).fill('Café');
  await expect(board).toHaveValue('draft kept');
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    ...before,
    version: 2,
    name: 'Café',
    elapsedMs: 123,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 677 },
  });
  await page.clock.runFor(676);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: 'Café',
    moves: 1,
    elapsedMs: 800,
    selection: { kind: 'closed' },
  });
});

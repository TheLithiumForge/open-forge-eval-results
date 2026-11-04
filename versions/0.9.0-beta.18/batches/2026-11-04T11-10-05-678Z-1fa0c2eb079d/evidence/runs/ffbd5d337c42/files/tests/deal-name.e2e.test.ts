import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('the native name field preserves Unicode and spaces within forty UTF-16 units', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(page.locator('details').getByLabel('Deal name', { exact: true })).toBeVisible();
  const limit = '😀'.repeat(20);
  await name.fill(limit);
  await name.press('End');
  await page.keyboard.type('x');
  await expect(name).toHaveValue(limit);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: limit });
  await page.locator('summary').click();
  await name.fill('   ');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: '   ' });
});

test('renaming active progress preserves its deal, draft, cards and running mismatch clock', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('unfinished board draft');
  const name = page.getByLabel('Deal name', { exact: true });
  const title = '  Café 😀  ';
  await name.fill(title);
  await expect(name).toBeFocused();
  await expect(board).toHaveValue('unfinished board draft');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...before, version: 2, name: title });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card.matched')).toHaveCount(2);
  const named = await exportedSnapshot(page);
  expect(named).toMatchObject({ name: title, elapsedMs: 800, moves: 2 });
  await page.locator('summary').click();
  await expect(board).toHaveValue('unfinished board draft');
  await name.fill('');
  await page.locator('summary').click();
  const { name: removed, ...progress } = named;
  expect(removed).toBe(title);
  expect(await exportedSnapshot(page)).toEqual({ ...progress, version: 1 });
});

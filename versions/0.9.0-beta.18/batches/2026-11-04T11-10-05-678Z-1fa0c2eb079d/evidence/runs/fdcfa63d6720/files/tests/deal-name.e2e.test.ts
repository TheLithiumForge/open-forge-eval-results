import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('Deal name is a native initially empty text input limited by UTF-16 length', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveJSProperty('tagName', 'INPUT');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveValue('');
  const limit = '😀'.repeat(20);
  await name.fill(limit);
  await name.press('End');
  await name.pressSequentially('x');
  await expect(name).toHaveValue(limit);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: limit });
});

test('naming during a mismatch preserves the deal, focus memory and its active interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.locator('.card').nth(7).focus();
  await page.clock.runFor(123);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('  Café 🂡  ');
  await expect(name).toBeFocused();
  await expect(page.locator('.card').nth(7)).toHaveAttribute('tabindex', '0');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...before, version: 2, name: '  Café 🂡  ' });
  await page.clock.runFor(676);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: '  Café 🂡  ',
    moves: 1,
    elapsedMs: 800,
    selection: { kind: 'closed' },
  });
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
});

test('fresh deal actions clear the name and reload keeps only saved size preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const action of ['New Game', 'Restart']) {
    await name.fill('Remember me');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Size change');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Board change');
  await page.getByLabel('Board code', { exact: true }).fill('np1-8-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Do not persist');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  const fresh = await exportedSnapshot(page);
  expect(fresh).toMatchObject({ version: 1, moves: 0, elapsedMs: 0, started: false });
  expect(fresh).not.toHaveProperty('name');
});

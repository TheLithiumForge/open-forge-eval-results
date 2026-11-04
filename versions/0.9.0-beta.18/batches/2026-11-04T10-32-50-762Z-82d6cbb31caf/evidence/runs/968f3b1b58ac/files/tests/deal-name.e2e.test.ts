import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('naming preserves running progress, spacing and Unicode, and clearing exports version 1', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  const code = page.getByLabel('Board code', { exact: true });
  await code.fill('keep this draft');
  await name.fill('  Café 🃏  ');
  await expect(name).toBeFocused();
  await expect(code).toHaveValue('keep this draft');
  const exportButton = page.getByRole('button', { name: 'Export snapshot', exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  await exportButton.click();
  await expect(exportButton).toBeFocused();
  expect(JSON.parse(await field.inputValue())).toEqual({
    ...before,
    version: 2,
    name: '  Café 🃏  ',
  });
  await page.clock.runFor(400);
  await exportButton.click();
  expect(JSON.parse(await field.inputValue())).toMatchObject({
    elapsedMs: 600,
    selection: { kind: 'mismatch', remainingMs: 200 },
  });
  await name.fill('🃏'.repeat(20));
  await name.press('End');
  await page.keyboard.type('x');
  await expect(name).toHaveValue('🃏'.repeat(20));
  await name.fill('');
  await page.locator('summary').click();
  const cleared = await exportedSnapshot(page);
  expect(cleared.version).toBe(1);
  expect(cleared).not.toHaveProperty('name');
  expect(cleared).toMatchObject({ ...before, elapsedMs: 600, selection: { remainingMs: 200 } });
});

test('deal changes and reload clear names without storing them in browser preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Reset me');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Reset size');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Reset board');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  const preferences = await page.evaluate(() => JSON.stringify(localStorage));
  await name.fill('Only in memory');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(preferences);
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 1, started: false, moves: 0 });
});

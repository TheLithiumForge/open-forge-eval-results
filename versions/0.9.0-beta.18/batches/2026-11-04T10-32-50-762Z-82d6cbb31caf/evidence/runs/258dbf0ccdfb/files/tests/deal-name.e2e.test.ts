import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('name limits count UTF-16 units and clearing returns to an unnamed export', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const save = page.getByRole('button', { name: 'Export snapshot', exact: true });
  for (const value of ['a'.repeat(40), '🃏'.repeat(20)]) {
    await name.fill(value);
    await name.press('End');
    await page.keyboard.insertText('x');
    await expect(name).toHaveValue(value);
    await save.click();
    expect(JSON.parse(await field.inputValue())).toMatchObject({ version: 2, name: value });
  }
  await name.fill('   ');
  await save.click();
  expect(JSON.parse(await field.inputValue())).toMatchObject({ version: 2, name: '   ' });
  await name.fill('');
  await save.click();
  const unnamed: unknown = JSON.parse(await field.inputValue());
  expect(unnamed).toMatchObject({ version: 1 });
  expect(unnamed).not.toHaveProperty('name');
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
});

test('fresh deals clear names and invalid board loads preserve them', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const code = page.getByLabel('Board code', { exact: true });
  await name.fill('Keep me');
  await code.fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('Keep me');
  for (const label of ['Restart', 'New Game']) {
    await name.fill('New name');
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(name).toHaveValue('');
  }
  await name.fill('Before size change');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Before board load');
  await code.fill('np1-8-1');
  const load = page.getByRole('button', { name: 'Load board', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('8');
});

test('named imports save the size without storing names and reload starts unnamed', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    JSON.stringify({
      name: 'Private deal',
      boardCode: 'np1-6-1',
      matched: [],
      moves: 0,
      elapsedMs: 500,
      started: true,
      selection: { kind: 'one', index: 5 },
      version: 2,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Private deal');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  const saved = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(JSON.parse(saved ?? 'null')).toEqual({ schemaVersion: 1, size: 6, bestMoves: {} });
  await name.fill('Edited while paused');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(saved);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  const fresh = await exportedSnapshot(page);
  expect(fresh).toMatchObject({ version: 1, matched: [], moves: 0, elapsedMs: 0, started: false });
  expect(fresh).not.toHaveProperty('name');
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

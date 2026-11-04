import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('deal replacements clear names and reload starts an unnamed game without storing its name', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const board = page.getByLabel('Board code', { exact: true });
  for (const button of ['New Game', 'Restart']) {
    await name.fill('Name to clear');
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(name).toHaveValue('');
    await expect(page.getByRole('button', { name: button, exact: true })).toBeFocused();
  }
  await name.fill('Name to clear');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Name to clear');
  await board.fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Name to clear');
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    JSON.stringify({
      boardCode: 'np1-6-1',
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
      version: 1,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await name.fill('A private deal name');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).not.toContain(
    'A private deal name',
  );
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
});

test('invalid named drafts keep the current name and progress and the name input enforces its limit', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('x'.repeat(41));
  await expect(name).toHaveValue('x'.repeat(40));
  await name.fill('😀'.repeat(20));
  await expect(name).toHaveValue('😀'.repeat(20));
  await name.fill('  Keep Café  ');
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  for (const invalid of [
    { ...before, version: 2 },
    { ...before, version: 1, name: 'Unexpected' },
    { ...before, version: 3, name: 'Unsupported' },
    ...['', 'x'.repeat(41), '😀'.repeat(21), 'a\rb', 'a\nb'].map((value) => ({
      ...before,
      version: 2,
      name: value,
    })),
  ]) {
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    await load.click();
    await expect(load).toBeFocused();
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('  Keep Café  ');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
    await expect(page.locator('.card.revealed')).toHaveCount(1);
  }
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('  Keep Café  ');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...before, version: 2, name: '  Keep Café  ' });
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(before);
});

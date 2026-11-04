import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('a native deal name preserves active progress and survives export, import and Resume', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(125);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café 🃏  ');
  await page.locator('summary').click();
  const named = { ...before, version: 2, name: '  Café 🃏  ' };
  expect(await exportedSnapshot(page)).toEqual(named);
  await page.clock.runFor(75);
  expect(await exportedSnapshot(page)).toMatchObject({
    ...named,
    elapsedMs: 200,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 600 },
  });
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(named));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(named.name);
  await name.fill('Paused');
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  await page.locator('.card').nth(2).click();
  expect(await exportedSnapshot(page)).toEqual({ ...named, name: 'Paused' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(2)).toBeFocused();
  await page.clock.runFor(674);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const cleared = await exportedSnapshot(page);
  expect(cleared.version).toBe(1);
  expect(cleared).not.toHaveProperty('name');
  expect(cleared.moves).toBe(before.moves);
});

test('deal resets clear names and browser preferences never retain them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Remember me');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Remember me');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Remember me');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  const limit = '🃏'.repeat(20);
  await name.fill(limit);
  await name.press('End');
  await name.pressSequentially('x');
  await expect(name).toHaveValue(limit);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: limit });
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  const fresh = await exportedSnapshot(page);
  expect(fresh.version).toBe(1);
  expect(fresh).not.toHaveProperty('name');
});

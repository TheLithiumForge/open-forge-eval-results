import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('deal names round trip without changing play, pause or the remaining mismatch interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(125);
  await page.locator('.card').nth(8).focus();
  const original = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveValue('');
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('unfinished board draft');
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  await snapshot.fill('unfinished snapshot draft');
  const title = '  Café 🎲  ';
  await name.fill(title);
  await expect(name).toBeFocused();
  await expect(board).toHaveValue('unfinished board draft');
  await expect(snapshot).toHaveValue('unfinished snapshot draft');
  await expect(page.locator('.card').nth(8)).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.locator('summary').click();
  const named = await exportedSnapshot(page);
  expect(named).toEqual({ ...original, version: 2, name: title });
  await page.clock.runFor(100);
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: title,
    elapsedMs: 225,
    selection: { kind: 'mismatch', remainingMs: 575 },
  });
  await page.locator('summary').click();
  await name.fill('temporary name');
  // Another serializer can emit the exact same fields in another order.
  await snapshot.fill(JSON.stringify(Object.fromEntries(Object.entries(named).reverse())));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(title);
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await name.fill('  Paused Café  ');
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...named, name: '  Paused Café  ' });
  await page.locator('.card').nth(3).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(674);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('invalid named drafts keep the current name, progress and editable draft', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Keep me');
  await page.locator('summary').click();
  const original = await exportedSnapshot(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  for (const invalid of [
    { ...original, name: '' },
    { ...original, name: 'a'.repeat(41) },
    { ...original, name: 'line\rbreak' },
    { ...original, name: 'line\nbreak' },
    { ...original, extra: true },
    { ...original, version: 1 },
    { ...original, version: 3 },
  ]) {
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
    await load.click();
    await expect(load).toBeFocused();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('Keep me');
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  }
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('Keep me');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(original);
  await page.clock.runFor(1000);
  expect(await exportedSnapshot(page)).toEqual({ ...original, elapsedMs: 1000 });
});

import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('editing a native deal name preserves active progress, drafts and the mismatch clock', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(225);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('keep this draft');
  const title = '  Café 😀  ';
  await name.fill(title);
  await expect(name).toBeFocused();
  await expect(board).toHaveValue('keep this draft');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...before, version: 2, name: title });
  await page.locator('summary').click();
  await name.fill('');
  await name.pressSequentially('a'.repeat(41));
  await expect(name).toHaveValue('a'.repeat(40));
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(574);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(800);
});

test('a pasted named snapshot accepts reordered fields, pauses and resumes its remaining time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const value = {
    name: 'Café',
    selection: { remainingMs: 300, second: 2, kind: 'mismatch', first: 1 },
    matched: [0, 11],
    elapsedMs: 1500,
    started: true,
    boardCode: 'np1-4-1',
    moves: 2,
    version: 2,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(value));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Café');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('.card').nth(3).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.card').nth(7)).toBeFocused();
  await name.fill('  Paused 😀  ');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...value, name: '  Paused 😀  ' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(7)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card.matched')).toHaveCount(2);
  expect(await exportedSnapshot(page)).toMatchObject({ name: '  Paused 😀  ', elapsedMs: 1800 });
});

test('invalid named saves keep the current name, board, paused state and entered draft', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  const baseline = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Current game');
  const saved = { ...baseline, version: 2, name: 'Current game' };
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(saved));
  await load.click();
  for (const invalid of [
    { ...saved, name: '' },
    { ...saved, name: 'x'.repeat(41) },
    { ...saved, name: 'bad\nname' },
    { ...saved, version: 1 },
    { ...saved, unknown: true },
  ]) {
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    await load.click();
    await expect(load).toBeFocused();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('Current game');
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  }
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(saved);
});

import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';

test('naming and loading progress preserve active and paused mismatch timing', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  const code = page.getByLabel('Board code', { exact: true });
  await code.fill('draft');
  await name.fill('  Café 🃏  ');
  await expect(name).toBeFocused();
  await expect(code).toHaveValue('draft');
  const save = page.getByRole('button', { name: 'Export snapshot', exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  await save.click();
  await expect(save).toBeFocused();
  const saved = await field.inputValue();
  expect(JSON.parse(saved)).toEqual({ ...before, version: 2, name: '  Café 🃏  ' });
  await page.clock.runFor(625);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await name.fill('Another name');
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('  Café 🃏  ');
  await expect(code).toHaveValue('np1-4-1');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('.card').nth(2).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await name.fill('Paused');
  await page.clock.runFor(2000);
  await save.click();
  expect(JSON.parse(await field.inputValue())).toEqual({ ...before, version: 2, name: 'Paused' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await save.click();
  expect(JSON.parse(await field.inputValue())).toMatchObject({
    name: 'Paused',
    elapsedMs: 800,
    moves: 1,
    selection: { kind: 'closed' },
  });
});

test('invalid named drafts keep progress and reordered legacy snapshots clear the name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Keep me');
  await page.locator('summary').click();
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  for (const invalid of [
    { ...before, name: '' },
    { ...before, name: 'a'.repeat(41) },
    { ...before, name: 'line\nbreak' },
    { ...before, name: '\r' },
    { ...before, extra: true },
    { ...before, version: 3 },
    { ...before, version: 1 },
    { ...before, moves: -1 },
  ]) {
    const text = JSON.stringify(invalid);
    await field.fill(text);
    await load.click();
    await expect(field).toHaveValue(text);
    await expect(name).toHaveValue('Keep me');
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  }
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(1000);
  expect(await exportedSnapshot(page)).toEqual({ ...before, elapsedMs: 1000 });
  await page.locator('summary').click();
  const legacy = {
    boardCode: 'np1-4-1',
    matched: [0, 11],
    moves: 2,
    elapsedMs: 1500,
    started: true,
    selection: { second: 2, remainingMs: 300, first: 1, kind: 'mismatch' },
    version: 1,
  };
  await field.fill(JSON.stringify(legacy));
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('completed named imports stay static and resumed named wins record a best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const completed = {
    name: 'Winner',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    version: 2,
  };
  await field.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue('Winner');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await name.fill('Completed');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ ...completed, name: 'Completed' });
  await page.locator('summary').click();
  await field.fill(
    JSON.stringify({ ...completed, matched: EXAMPLE_PAIRS.slice(0, -1).flat(), moves: 7 }),
  );
  await load.click();
  await name.fill('Almost there');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('summary').click();
  for (const index of [1, 9]) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: 'Almost there',
    version: 2,
    moves: 8,
  });
});

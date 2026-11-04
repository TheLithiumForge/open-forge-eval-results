import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('the native deal name preserves characters, limits typing and switches snapshot versions', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('🃏'.repeat(20));
  await name.press('End');
  await page.keyboard.insertText('x');
  await expect(name).toHaveValue('🃏'.repeat(20));
  await name.fill('  Café 🃏 <pair>  ');
  await expect(name).toBeFocused();
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  const text = await page.getByLabel('Snapshot JSON', { exact: true }).inputValue();
  expect(JSON.parse(text)).toMatchObject({ version: 2, name: '  Café 🃏 <pair>  ' });
  await name.fill('other');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('  Café 🃏 <pair>  ');
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
});

test('renaming a running mismatch keeps its progress, clock, drafts and announcement', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const board = page.getByLabel('Board code', { exact: true });
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  await board.fill('keep board draft');
  await draft.fill('keep snapshot draft');
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Remember this miss');
  await expect(name).toBeFocused();
  await expect(board).toHaveValue('keep board draft');
  await expect(draft).toHaveValue('keep snapshot draft');
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    ...before,
    version: 2,
    name: 'Remember this miss',
  });
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: 'Remember this miss',
    moves: 1,
    elapsedMs: 800,
    selection: { kind: 'closed' },
  });
});

test('external named progress restores verbatim and renaming keeps it paused until Resume', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const saved = {
    name: '  Café  ',
    selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
    started: true,
    elapsedMs: 1500,
    moves: 2,
    matched: [0, 11],
    boardCode: 'np1-4-1',
    version: 2,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(saved));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('  Café  ');
  await name.fill('Paused edit');
  await page.locator('.card').nth(3).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...saved, name: 'Paused edit' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({ name: 'Paused edit', elapsedMs: 1800 });
});

test('invalid named imports retain the current name, progress and entered draft', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(500);
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('Keep me');
  await page.locator('summary').click();
  const original = await exportedSnapshot(page);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  for (const invalid of [
    { ...original, name: '' },
    { ...original, name: 'x'.repeat(41) },
    { ...original, name: 'line\nbreak' },
    { ...original, name: 'line\rbreak' },
    { ...original, extra: true },
    { ...original, version: 1 },
    { ...original, version: 3 },
  ]) {
    const text = JSON.stringify(invalid);
    await draft.fill(text);
    await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    await expect(draft).toHaveValue(text);
    await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Keep me');
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  }
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(original);
});

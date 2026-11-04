import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { pasteSnapshot, readNamedSnapshot } from './named-snapshot-fixture.ts';

test('pasted snapshots accept reordered fields and an unnamed import clears an existing name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('Previous name');
  const saved = {
    started: true,
    elapsedMs: 275,
    moves: 0,
    selection: { index: 2, kind: 'one' },
    matched: [],
    boardCode: 'np1-4-1',
    version: 1,
  };
  await pasteSnapshot(page, JSON.stringify(saved));
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.locator('.card').nth(2)).toHaveClass('card revealed');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  expect(await readNamedSnapshot(page)).toEqual(saved);
  const named = { ...saved, version: 2, name: '  Café 🎴  ' };
  await pasteSnapshot(page, JSON.stringify(named));
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue(named.name);
  expect(await readNamedSnapshot(page)).toEqual(named);
});

test('invalid named drafts keep the existing game name pause and entered draft', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const saved = {
    version: 2,
    name: 'Keep me',
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 },
    moves: 1,
    elapsedMs: 1500,
    started: true,
  };
  await pasteSnapshot(page, JSON.stringify(saved));
  const invalid = [
    { ...saved, name: '' },
    { ...saved, name: undefined },
    { ...saved, name: null },
    { ...saved, name: 'x'.repeat(41) },
    { ...saved, name: 'bad\rname' },
    { ...saved, name: 'bad\nname' },
    { ...saved, version: 1 },
    { ...saved, version: 3 },
    { ...saved, extra: true },
    { ...saved, matched: undefined },
    { ...saved, selection: { ...saved.selection, extra: true } },
  ];
  for (const value of invalid) {
    const draft = JSON.stringify(value);
    await pasteSnapshot(page, draft);
    await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(draft);
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Keep me');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    expect(await readNamedSnapshot(page)).toEqual(saved);
  }
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('invalid');
  expect(await readNamedSnapshot(page)).toEqual(saved);
});

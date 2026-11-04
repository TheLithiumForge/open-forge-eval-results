import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { pasteSnapshot, readNamedSnapshot } from './named-snapshot-fixture.ts';

test('deal names use a native input and preserve text in named and unnamed exports', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  expect(await name.evaluate((element) => element.tagName)).toBe('INPUT');
  const preserved = '  Café 🎴  ';
  await name.fill(preserved);
  await expect(name).toBeFocused();
  const unnamed = {
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  expect(await readNamedSnapshot(page)).toEqual({ ...unnamed, version: 2, name: preserved });
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  expect(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue()).toContain('\n');
  await name.fill('');
  expect(await readNamedSnapshot(page)).toEqual(unnamed);
  await name.fill('🎴'.repeat(20));
  await name.press('End');
  await page.keyboard.insertText('x');
  await expect(name).toHaveValue('🎴'.repeat(20));
});

test('renaming running progress preserves the pending interval and board focus memory', async ({
  page,
}) => {
  await loadTimedBoard(page);
  for (const index of [2, 6, 0, 1]) await page.locator('.card').nth(index).click();
  await page.clock.runFor(175);
  const before = await readNamedSnapshot(page);
  expect(before).toMatchObject({
    version: 1,
    matched: [2, 6],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 625 },
    moves: 2,
    elapsedMs: 175,
  });
  await page.locator('.card').nth(9).focus();
  await page.getByLabel('Deal name', { exact: true }).fill('Running Café');
  await expect(page.locator('.card').nth(9)).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  expect(await readNamedSnapshot(page)).toEqual({ ...before, version: 2, name: 'Running Café' });
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(14);
  expect(await readNamedSnapshot(page)).toMatchObject({
    name: 'Running Café',
    elapsedMs: 800,
    moves: 2,
    selection: { kind: 'closed' },
  });
});

test('a paused named import can be renamed before Resume continues its exact remaining time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const saved = {
    name: '  Café 🎴  ',
    started: true,
    elapsedMs: 1500,
    moves: 1,
    selection: { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
    matched: [],
    boardCode: 'np1-4-1',
    version: 2,
  };
  await pasteSnapshot(page, JSON.stringify(saved));
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue(saved.name);
  await page.getByLabel('Deal name', { exact: true }).fill('Renamed while paused');
  await page.clock.runFor(2000);
  await page.locator('.card').nth(2).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  expect(await readNamedSnapshot(page)).toEqual({ ...saved, name: 'Renamed while paused' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await readNamedSnapshot(page)).toMatchObject({
    name: 'Renamed while paused',
    elapsedMs: 1800,
    moves: 1,
    selection: { kind: 'closed' },
  });
});

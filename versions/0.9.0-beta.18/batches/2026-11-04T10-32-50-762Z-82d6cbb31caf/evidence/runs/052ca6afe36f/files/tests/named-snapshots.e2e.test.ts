import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';

// External JSON can put version last and reverse the selection's field order.
const PASTED = {
  selection: { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
  elapsedMs: 1500,
  started: true,
  moves: 2,
  matched: [2, 6],
  boardCode: 'np1-4-1',
  name: '  Café 🃏  ',
  version: 2,
};

test('exported named progress restores its name and cards after starting another game', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('  Café  ');
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const saved = await field.inputValue();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(field).toHaveValue(saved);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('  Café  ');
  await expect(page.locator('.card').nth(2)).toHaveClass(/revealed/);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('pasted named and legacy saves restore progress regardless of JSON field order', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(PASTED));
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(PASTED.name);
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await name.fill('  paused name  ');
  await page.locator('summary').click();
  await page.locator('.card').nth(4).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual({ ...PASTED, name: '  paused name  ' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: '  paused name  ',
    elapsedMs: 1800,
    matched: [2, 6],
    moves: 2,
    selection: { kind: 'closed' },
  });
  const legacy = {
    selection: PASTED.selection,
    elapsedMs: PASTED.elapsedMs,
    started: true,
    moves: 2,
    matched: [2, 6],
    boardCode: 'np1-4-1',
    version: 1,
  };
  await page.locator('summary').click();
  await field.fill(JSON.stringify(legacy));
  await load.click();
  await expect(name).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
});

test('invalid named saves keep the name, game, clock and draft available for correction', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('current game');
  await page.locator('summary').click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(50);
  const before = await exportedSnapshot(page);
  const invalid = [
    { ...PASTED, name: '' },
    { ...PASTED, name: 'x'.repeat(41) },
    { ...PASTED, name: 'a\nb' },
    { ...PASTED, version: 1 },
    { ...PASTED, version: 3 },
    { ...PASTED, moves: 0 },
    { ...PASTED, extra: true },
  ];
  for (const value of invalid) {
    await page.locator('summary').click();
    const draft = JSON.stringify(value);
    const field = page.getByLabel('Snapshot JSON', { exact: true });
    await field.fill(draft);
    await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('current game');
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(before);
  }
  await page.clock.runFor(100);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(150);
});

test('named completed imports stay static and resumed named wins record a best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const completed = {
    ...PASTED,
    name: 'finished',
    selection: { kind: 'closed' },
    matched: EXAMPLE_PAIRS.flat(),
    moves: 8,
  };
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue('finished');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('renamed win');
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: 'renamed win',
    elapsedMs: 1500,
    moves: 8,
  });
  await page.locator('summary').click();
  await field.fill(
    JSON.stringify({
      ...completed,
      name: 'finish after Resume',
      matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
      moves: 7,
    }),
  );
  await load.click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of [1, 9]) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  await expect(name).toHaveValue('finish after Resume');
});

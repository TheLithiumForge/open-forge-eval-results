import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';

test('a deal name round trips without changing progress, clock, pause or board drafts', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  const original = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await page.getByLabel('Board code', { exact: true }).fill('draft');
  const title = '  Café 🃏  ';
  await name.fill(title);
  await expect(name).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft');
  await page.locator('summary').click();
  const named = await exportedSnapshot(page);
  expect(named).toEqual({ ...original, version: 2, name: title });
  await page.clock.runFor(25);
  expect(await exportedSnapshot(page)).toMatchObject({ elapsedMs: 200 });
  await page.locator('summary').click();
  await name.fill('Other name');
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(named));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(title);
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await name.fill('Renamed while paused');
  await page.locator('summary').click();
  await page.clock.runFor(5000);
  expect(await exportedSnapshot(page)).toEqual({ ...named, name: 'Renamed while paused' });
  await page.locator('.card').nth(8).click();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(8)).toBeFocused();
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(14);
  for (const pair of EXAMPLE_PAIRS.slice(1))
    for (const index of pair) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Renamed while paused' });
});

test('clearing names and replacing deals keep unnamed saves compatible and names out of preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('a'.repeat(40));
  await name.press('End');
  await name.press('b');
  await expect(name).toHaveValue('a'.repeat(40));
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(Object.hasOwn(unnamed, 'name')).toBe(false);
  await page.locator('summary').click();
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Clear me');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Clear me');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Clear me');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Clear me');
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(unnamed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Never store this name');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'Never store this name',
  );
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('completed named imports keep a static win and best score while allowing name edits', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const complete = {
    name: 'Café',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    version: 2,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(complete));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Café');
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.getByLabel('Deal name', { exact: true }).fill('Renamed win');
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual({ ...complete, name: 'Renamed win' });
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
});

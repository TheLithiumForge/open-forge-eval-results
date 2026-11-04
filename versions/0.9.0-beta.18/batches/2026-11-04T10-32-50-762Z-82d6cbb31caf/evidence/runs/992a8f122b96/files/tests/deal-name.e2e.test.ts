import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('editing a deal name preserves running progress, draft, focus and mismatch timing', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await page.getByLabel('Board code', { exact: true }).fill('draft');
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  await name.fill('  Café 🃏  ');
  await expect(name).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft');
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  expect(JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue())).toEqual({
    version: 2,
    name: '  Café 🃏  ',
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 625 },
    moves: 1,
    elapsedMs: 175,
    started: true,
  });
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(800);
});

test('starting, restarting, changing size and loading a board clear the name', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Keep this progress');
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(name).toHaveValue('');
  }
  await name.fill('Another deal');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Another board');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  const load = page.getByRole('button', { name: 'Load board', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('');
});

test('names stay out of preferences and reload starts an unnamed fresh deal', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await page.getByLabel('Deal name', { exact: true }).fill('Private name');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    JSON.stringify({ schemaVersion: 1, size: 6, bestMoves: {} }),
  );
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 1, moves: 0, started: false });
});

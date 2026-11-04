import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('named snapshot round trips pause progress and editing its name keeps the remaining interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(500);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Café');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(saved));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('Café');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('.card').nth(2).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await name.fill('  Paused Café  ');
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual({ ...saved, name: '  Paused Café  ' });
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: '  Paused Café  ',
    elapsedMs: 800,
    moves: 1,
    selection: { kind: 'closed' },
  });
});

test('loading unnamed progress clears an existing name and keeps legacy pause behavior', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Replace me');
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    JSON.stringify({
      boardCode: 'np1-4-1',
      matched: [],
      selection: { index: 2, kind: 'one' },
      moves: 0,
      elapsedMs: 1500,
      started: true,
      version: 1,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved.version).toBe(1);
  expect(saved).not.toHaveProperty('name');
  expect(saved).toMatchObject({ moves: 0, elapsedMs: 1500 });
});

test('completed named imports stay static while completing unfinished named progress records a best', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ schemaVersion: 1, size: 4, bestMoves: { '4': 12 } }),
      ),
    PREFERENCES_KEY,
  );
  await loadTimedBoard(page, gameURL);
  const stored = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const completed = {
    version: 2,
    name: 'Complete',
    boardCode: 'np1-4-1',
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
  };
  await field.fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('12');
  await page.getByLabel('Deal name', { exact: true }).fill('  Renamed completion  ');
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual({
    ...completed,
    matched: Array.from({ length: 16 }, (_, index) => index),
    name: '  Renamed completion  ',
  });
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(stored);
  await page.locator('summary').click();
  await field.fill(
    JSON.stringify({ ...completed, matched: EXAMPLE_PAIRS.slice(0, -1).flat(), moves: 7 }),
  );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of EXAMPLE_PAIRS.at(-1) ?? []) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    JSON.stringify({ schemaVersion: 1, size: 4, bestMoves: { '4': 8 } }),
  );
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Complete');
});

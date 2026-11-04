import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('reordered named progress restores its name and remains paused through editing until Resume', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const saved = {
    name: '  Café 😀  ',
    elapsedMs: 1500,
    selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
    started: true,
    matched: [0, 11],
    boardCode: EXAMPLE_CODE,
    moves: 2,
    version: 2,
  };
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(saved));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue(saved.name);
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await name.fill('  Paused 😀  ');
  await page.locator('summary').click();
  const renamed = { ...saved, name: '  Paused 😀  ' };
  expect(await exportedSnapshot(page)).toEqual(renamed);
  await page.locator('.card').nth(4).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual(renamed);
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await resume.click();
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await expect(resume).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: renamed.name,
    elapsedMs: 1800,
    selection: { kind: 'closed' },
  });
});

test('completed named imports stay static and editable while a resumed named win records its best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const completed = {
    version: 2,
    name: 'Finished Café',
    boardCode: EXAMPLE_CODE,
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 500,
    started: true,
  };
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue(completed.name);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('Edited completed game');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, name: 'Edited completed game' });
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');

  await page.locator('summary').click();
  await field.fill(
    JSON.stringify({
      ...completed,
      name: 'One pair left',
      matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
      moves: 7,
    }),
  );
  await load.click();
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of EXAMPLE_PAIRS[7]) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'One pair left' });
});

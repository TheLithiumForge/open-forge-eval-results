import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const PASTED = {
  boardCode: 'np1-4-1',
  selection: { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
  elapsedMs: 1500,
  started: true,
  moves: 2,
  matched: [2, 6],
  name: 'Café',
  version: 2,
};

test('pasted named progress restores paused, allows renaming and resumes its remaining interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  await draft.fill(JSON.stringify(PASTED));
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('Café');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.locator('.card').nth(4).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await name.fill('  Renamed 🃏  ');
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...PASTED, name: '  Renamed 🃏  ' });
  await page.locator('summary').click();
  const invalid = JSON.stringify({ ...PASTED, name: 'x'.repeat(41), boardCode: 'np1-6-1' });
  await draft.fill(invalid);
  await load.click();
  await expect(draft).toHaveValue(invalid);
  await expect(name).toHaveValue('  Renamed 🃏  ');
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({ name: '  Renamed 🃏  ', elapsedMs: 1800 });
  await page.locator('summary').click();
  const { name: savedName, ...unnamed } = PASTED;
  expect(savedName).toBe('Café');
  await draft.fill(JSON.stringify({ ...unnamed, version: 1 }));
  await load.click();
  await expect(name).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('completed named imports stay static and editable while a resumed win records a best', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  const completed = {
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    name: 'Finished',
    version: 2,
  };
  await draft.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue('Finished');
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('Saved win');
  await page.clock.runFor(2000);
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, name: 'Saved win' });
  await page.locator('summary').click();
  await draft.fill(
    JSON.stringify({
      ...completed,
      matched: completed.matched.filter((index) => index !== 8 && index !== 15),
      moves: 7,
    }),
  );
  await load.click();
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(8).click();
  await page.locator('.card').nth(15).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Finished', moves: 8 });
  await page.reload();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
});

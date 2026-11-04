import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const NAMED = {
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [0, 11],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
  version: 2,
};

test('reordered named progress loads paused and resumes its saved mismatch and clock', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(NAMED));
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('Café');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await name.fill('  Renamed while paused  ');
  await page.locator('.card').nth(3).click();
  await page.keyboard.press('Enter');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  const paused = await exportedSnapshot(page);
  expect(paused).toEqual({ ...NAMED, name: '  Renamed while paused  ' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: '  Renamed while paused  ',
    elapsedMs: 1800,
    selection: { kind: 'closed' },
  });
  await page.locator('summary').click();
  const { name: priorName, ...legacy } = NAMED;
  expect(priorName).toBe('Café');
  await field.fill(JSON.stringify({ ...legacy, version: 1 }));
  await load.click();
  await expect(name).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('invalid named saves preserve the draft and game and completed imports stay static', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(NAMED));
  await load.click();
  for (const invalid of [
    { ...NAMED, name: '' },
    { ...NAMED, name: 'a\nb' },
    { ...NAMED, name: '🃏'.repeat(21) },
    { ...NAMED, extra: true },
    { ...NAMED, version: 3 },
    { ...NAMED, moves: 1 },
  ]) {
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    await load.click();
    await expect(field).toHaveValue(draft);
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(NAMED);
    await page.locator('summary').click();
  }
  await field.fill(
    JSON.stringify({
      ...NAMED,
      matched: Array.from({ length: 16 }, (_, index) => index),
      selection: { kind: 'closed' },
      moves: 8,
    }),
  );
  await load.click();
  await expect(name).toHaveValue('Café');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('Finished');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    name: 'Finished',
    elapsedMs: 1500,
    moves: 8,
  });
});

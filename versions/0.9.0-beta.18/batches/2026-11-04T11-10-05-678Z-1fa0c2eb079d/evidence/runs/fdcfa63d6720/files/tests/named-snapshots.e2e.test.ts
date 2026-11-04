import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const PENDING = {
  selection: { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
  elapsedMs: 500,
  moves: 1,
  matched: [],
  started: true,
  boardCode: 'np1-4-1',
  name: '  Café  ',
  version: 2,
};

test('reordered named snapshots restore their name and editing while paused preserves progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  await draft.fill(JSON.stringify(PENDING));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(PENDING.name);
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('.card').nth(7).focus();
  await name.fill('  Still paused  ');
  await expect(page.locator('.card').nth(7)).toHaveAttribute('tabindex', '0');
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(5000);
  await page.locator('summary').click();
  const paused = await exportedSnapshot(page);
  expect(paused).toEqual({ ...PENDING, name: '  Still paused  ' });
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.locator('.card').nth(2)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({ name: '  Still paused  ', elapsedMs: 800 });
});

test('named export loads again and a reordered unnamed snapshot clears the name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Café');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  await draft.fill(JSON.stringify(saved));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('Café');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  const unnamed = {
    started: true,
    elapsedMs: 100,
    moves: 0,
    selection: { index: 5, kind: 'one' },
    matched: [],
    boardCode: 'np1-6-1',
    version: 1,
  };
  await draft.fill(JSON.stringify(unnamed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(unnamed);
});

test('invalid named drafts retain the active name, paused progress and entered text', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await draft.fill(JSON.stringify(PENDING));
  await load.click();
  const invalid = JSON.stringify({ ...PENDING, name: 'Invalid\nname' });
  await draft.fill(invalid);
  await load.click();
  await expect(draft).toHaveValue(invalid);
  await expect(name).toHaveValue(PENDING.name);
  await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue(PENDING.name);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(PENDING);
});

test('completed named imports and later name edits keep the win static and best scores untouched', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const complete = {
    ...PENDING,
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(complete));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.getByLabel('Deal name', { exact: true }).fill('Finished Café');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...complete, name: 'Finished Café' });
});

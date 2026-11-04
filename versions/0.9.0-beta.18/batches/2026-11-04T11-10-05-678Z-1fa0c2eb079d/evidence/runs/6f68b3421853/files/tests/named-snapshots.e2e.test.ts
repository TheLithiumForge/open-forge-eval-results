import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const PENDING = {
  boardCode: 'np1-4-1',
  matched: [0, 11],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
  name: '  Café 😀  ',
  version: 2,
};

test('reordered named saves restore editable paused progress and Resume preserves focus and time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const json = page.getByLabel('Snapshot JSON', { exact: true });
  await json.fill(JSON.stringify(PENDING));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue(PENDING.name);
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.locator('.card').nth(4).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await name.fill('Paused edit');
  await page.clock.runFor(2000);
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...PENDING, name: 'Paused edit' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({ name: 'Paused edit', elapsedMs: 1800 });
  await page.locator('summary').click();
  const legacy = {
    selection: { index: 2, kind: 'one' },
    started: true,
    elapsedMs: 70,
    moves: 0,
    matched: [],
    boardCode: 'np1-4-1',
    version: 1,
  };
  await json.fill(JSON.stringify(legacy));
  await load.click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
});

test('invalid name and snapshot schemas keep the name, progress, pause and pasted draft', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(PENDING));
  await load.click();
  for (const overrides of [
    { name: '' },
    { name: 'x'.repeat(41) },
    { name: '😀'.repeat(21) },
    { name: 'line\nbreak' },
    { name: 'line\rbreak' },
    { name: 1 },
    { version: 1 },
    { version: 3 },
    { extra: true },
  ]) {
    const draft = JSON.stringify({ ...PENDING, ...overrides });
    await field.fill(draft);
    await load.click();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue(PENDING.name);
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await expect(page.locator('.card.matched')).toHaveCount(2);
    await expect(page.locator('.card.revealed')).toHaveCount(2);
  }
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(PENDING);
});

import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const NAME = 'Night 🌙 — café <pairs>';

test('a name saves with progress and returns from a reordered pasted snapshot', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Game name', exact: true });
  await expect(name).toHaveAttribute('maxlength', '100');
  await name.fill(NAME);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ name: NAME, started: false, elapsedMs: 0 });
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(500);
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({ name: NAME, matched: [2, 6], elapsedMs: 500, moves: 1 });
  await page.locator('summary').click();
  await name.fill('Another name');
  await page.clock.runFor(200);
  await expect(name).toBeFocused();
  await expect(name).toHaveValue('Another name');
  await page
    .getByLabel('Snapshot JSON', { exact: true })
    .fill(JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(NAME);
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.locator('summary').click();
  await page.clock.runFor(1000);
  expect(await exportedSnapshot(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(200);
  expect(await exportedSnapshot(page)).toMatchObject({ ...saved, elapsedMs: 700 });
});

test('renaming during a mismatch preserves time, focus and turn feedback', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(99);
  await page.locator('summary').click();
  const name = page.getByLabel('Game name', { exact: true });
  await name.fill(NAME);
  await page.clock.runFor(100);
  await expect(name).toBeFocused();
  await expect(name).toHaveValue(NAME);
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    name: NAME,
    moves: 1,
    elapsedMs: 199,
    selection: { kind: 'mismatch', remainingMs: 601 },
  });
  await page.clock.runFor(600);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({ name: NAME, elapsedMs: 800 });
});

test('invalid loads keep the name while unnamed snapshots and fresh deals clear it', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const unnamed = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Game name', { exact: true });
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  await name.fill(NAME);
  await snapshot.fill(JSON.stringify({ ...unnamed, name: 12 }));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await expect(name).toHaveValue(NAME);
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue(NAME);
  await snapshot.fill(JSON.stringify(unnamed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue(NAME);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).not.toHaveProperty('name');
});

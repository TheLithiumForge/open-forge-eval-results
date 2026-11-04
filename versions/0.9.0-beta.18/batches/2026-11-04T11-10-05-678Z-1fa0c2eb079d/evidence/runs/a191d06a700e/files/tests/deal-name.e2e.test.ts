import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('Deal name starts empty, preserves text and limits native input to forty code units', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café ☕  ');
  await expect(name).toBeFocused();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: '  Café ☕  ' });
  await page.locator('summary').click();
  const fortyUnits = '🚀'.repeat(20);
  await name.fill(fortyUnits);
  await name.press('End');
  await name.pressSequentially('x');
  await expect(name).toHaveValue(fortyUnits);
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
});

test('editing a running deal preserves progress, board draft and the pending clock interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('draft');
  await page.getByLabel('Deal name', { exact: true }).fill('In progress');
  await expect(board).toHaveValue('draft');
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...before, version: 2, name: 'In progress' });
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(800);
});

test('new deals, Restart, size changes and board loads clear the name', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const label of ['New Game', 'Restart']) {
    await name.fill('Temporary');
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(name).toHaveValue('');
    await expect(button).toBeFocused();
  }
  await name.fill('Temporary');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await expect(page.locator('.card')).toHaveCount(36);
  await name.fill('Temporary');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  const load = page.getByRole('button', { name: 'Load board', exact: true });
  await load.click();
  await expect(name).toHaveValue('');
  await expect(load).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(16);
});

test('names never enter saved preferences and reload starts an unnamed fresh deal', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  const before = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('Do not persist');
  await page.locator('.card').first().click();
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(before);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 1,
    matched: [],
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});

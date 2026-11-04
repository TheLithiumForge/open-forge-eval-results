import { expect, test } from '@playwright/test';
import { finish, freezeTime, loadBoard, loadSnapshot, pairsFor, pendingSnapshot } from './helpers.ts';

test.beforeEach(async ({ page }) => { await freezeTime(page); await page.goto('/'); await loadBoard(page); });

test('drafts survive play, invalid loads preserve state and export keeps focus', async ({ page }) => {
  await page.getByLabel('Board code', { exact: true }).fill('incorrect');
  await page.locator('.card').first().click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('incorrect');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid board code.');
  await expect(page.locator('.revealed')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill('{"wrong":true}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue('{"wrong":true}');
  await expect(page.locator('.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  const exported: unknown = JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  expect(exported).toMatchObject({ version: 1, boardCode: 'np1-4-1', selection: { kind: 'one', index: 0 } });
});

test('unfinished imports pause input and time until Resume returns remembered focus', async ({ page }) => {
  await loadSnapshot(page, pendingSnapshot);
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await page.clock.runFor(2000);
  await page.locator('.card').nth(3).click({ force: true });
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(page.locator('.revealed')).toHaveCount(2);
  await expect(page.getByText('Time: 0:01', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(7)).toBeFocused();
  await page.clock.runFor(280);
  await expect(page.locator('.revealed')).toHaveCount(2);
  await page.clock.runFor(40);
  await expect(page.locator('.revealed')).toHaveCount(0);
});

test('completed imports stay static and never replace best; resumed wins do', async ({ page }) => {
  await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  const all = pairsFor('np1-4-1').flat();
  const completed = { ...pendingSnapshot, matched: all, moves: 20, selection: { kind: 'closed' } };
  await loadSnapshot(page, completed);
  await expect(page.locator('.win')).not.toHaveClass(/pulse/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  const pair = pairsFor('np1-4-1')[0];
  if (!pair) throw new Error('Missing pair');
  await loadSnapshot(page, { ...completed, matched: all.filter(index => !pair.includes(index)), moves: 7 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of pair) await page.locator('.card').nth(index).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

test('successful loads remember size; invalid loads and storage failures remain playable', async ({ page }) => {
  await loadBoard(page, 'np1-6-1');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('6');
  await page.getByLabel('Board code', { exact: true }).fill('np1-8-0');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('6');
  await expect(page.locator('.card')).toHaveCount(36);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('unavailable'); } });
  });
  await page.reload(); await loadBoard(page);
  await finish(page);
  await expect(page.locator('.win')).toBeVisible();
});

test('resumed wins replace a worse best and preserve equal or better records', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('neon-pairs.best.v1', '{"4":20}'));
  await page.reload(); await loadBoard(page);
  const pairs = pairsFor('np1-4-1');
  const last = pairs[0];
  if (!last) throw new Error('Missing pair');
  const matched = pairs.flat().filter(index => !last.includes(index));
  for (const moves of [8, 8, 10]) {
    await loadSnapshot(page, { ...pendingSnapshot, matched, selection: { kind: 'closed' }, moves });
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    for (const index of last) await page.locator('.card').nth(index).click();
    await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
});

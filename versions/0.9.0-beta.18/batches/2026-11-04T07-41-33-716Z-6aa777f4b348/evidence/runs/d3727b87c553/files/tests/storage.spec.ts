import { expect, test } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, nearWin, readSnapshot } from './gameDriver.ts';

const key = 'neon-pairs.preferences.v1';
test('best improves only on actual better wins and survives reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep me'));
  for (const [before, expected] of [[9, 10], [8, 9], [8, 9], [10, 9]]) {
    if (before === undefined || expected === undefined) throw new Error('Missing test score');
    await loadSnapshot(page, nearWin(before));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(12).click();
    await cards(page).nth(13).click();
    await expect(page.getByText(`Best: ${expected}`, { exact: true })).toBeVisible();
  }
  await loadSnapshot(page, { ...nearWin(8), matched: Array.from({ length: 16 }, (_, i) => i) });
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep me');
});

test('loaded sizes persist but active progress does not', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-6-1');
  await cards(page).nth(0).click();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(cards(page)).toHaveCount(36);
  const fresh = await readSnapshot(page);
  expect(fresh.board.code).not.toBe('np1-6-1');
  expect(fresh).toMatchObject({ moves: 0, started: false, selection: { kind: 'closed' } });
  await loadSnapshot(page, { ...nearWin(), board: nearWin().board });
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
});

for (const saved of ['{', '{"version":1,"size":5,"bests":{"4":1000000}}', 'null']) test(`ignores malformed preferences ${saved}`, async ({ page }) => {
  await page.addInitScript(({ name, value }) => localStorage.setItem(name, value), { name: key, value: saved });
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await cards(page).nth(0).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

test('unavailable storage leaves play, loading, winning and local best usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } }));
  await page.goto('/');
  await loadSnapshot(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

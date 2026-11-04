import { expect, test } from '@playwright/test';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { cards, loadBoard, loadSnapshot, openGame, snapshot, statistics } from './game.ts';

test('best scores improve, persist and remain unchanged by completed imports (A05–A06, R08–R11)', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  for (const moves of [9, 9, 10, 7]) {
    await loadSnapshot(page, snapshot(4, moves, false));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(11).click();
    await expect(statistics(page)).toContainText(`Best: ${moves === 7 ? 8 : 10}`);
  }
  await loadSnapshot(page, snapshot(4, 8));
  await expect(statistics(page)).toContainText('Best: 8');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(statistics(page)).toContainText('Best: none');
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(statistics(page)).toContainText('Moves: 0');
  await loadBoard(page);
  await expect(statistics(page)).toContainText('Best: 8');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toEqual([PREFERENCES_KEY, 'unrelated'].sort());
});

test('invalid saved JSON, unsupported sizes and oversized scores are ignored (R11)', async ({ page }) => {
  await openGame(page);
  for (const value of ['{', '{"size":5,"bests":{}}', '{"size":4,"bests":{"4":1000000}}']) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: PREFERENCES_KEY, value });
    await page.reload();
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
    await expect(statistics(page)).toContainText('Best: none');
  }
});

test('blocked storage access leaves play and in-memory records available (R11)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Denied'); } });
  });
  await openGame(page);
  await loadSnapshot(page, snapshot(4, 7, false));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(11).click();
  await expect(statistics(page)).toContainText('Best: 8');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(statistics(page)).toContainText('Moves: 0');
  await expect(statistics(page)).toContainText('Best: 8');
});

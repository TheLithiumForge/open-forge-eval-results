import { expect, test } from '@playwright/test';
import { cards, completed, loadBoard, loadProgress, nearWin, openGame, stat } from './support.ts';

test('best scores improve only, survive reload and ignore completed imports', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => localStorage.setItem('unrelated-app', 'keep'));
  for (const [before, best] of [[9, 10], [8, 9], [8, 9], [10, 9]]) {
    if (before === undefined || best === undefined) throw new Error('Invalid test vector.');
    await loadProgress(page, nearWin(before));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(2).click();
    await cards(page).nth(6).click();
    await expect(stat(page, 'Best')).toHaveText(`Best: ${best}`);
  }
  await loadProgress(page, completed());
  await expect(stat(page, 'Best')).toHaveText('Best: 9');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.best.4'))).toBe('9');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-app'))).toBe('keep');
  await page.reload();
  await expect(stat(page, 'Best')).toHaveText('Best: 9');
  await expect(stat(page, 'Moves')).toHaveText('Moves: 0');
});

test('last supported size survives reload with a fresh hidden deal', async ({ page }) => {
  await openGame(page);
  await loadBoard(page, 'np1-8-1');
  await cards(page).nth(0).click();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  await expect(cards(page)).toHaveCount(64);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await expect(page.getByLabel('Board code')).not.toHaveValue('np1-8-1');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(cards(page)).toHaveCount(36);
  await expect(stat(page, 'Best')).toHaveText('Best: none');
  await expect(stat(page, 'Time')).toHaveText('Time: 0:00');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.size'))).toBe('6');
});

test('malformed preferences are ignored independently', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('neon-pairs.size', '"16"');
    localStorage.setItem('neon-pairs.best.4', '1000000');
    localStorage.setItem('neon-pairs.best.6', '12');
    localStorage.setItem('neon-pairs.best.8', '{');
  });
  await openGame(page);
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(stat(page, 'Best')).toHaveText('Best: none');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(stat(page, 'Best')).toHaveText('Best: 12');
});

for (const failure of ['getter', 'read', 'write']) {
  test(`storage ${failure} failure leaves play and local best available`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (mode === 'getter') {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('Blocked'); } });
      } else {
        const method = mode === 'read' ? 'getItem' : 'setItem';
        Storage.prototype[method] = () => { throw new Error('Blocked'); };
      }
    }, failure);
    await openGame(page);
    await loadProgress(page, nearWin());
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(2).click();
    await cards(page).nth(6).click();
    await expect(stat(page, 'Best')).toHaveText('Best: 8');
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(stat(page, 'Best')).toHaveText('Best: 8');
    await expect(stat(page, 'Moves')).toHaveText('Moves: 0');
  });
}

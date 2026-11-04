import { expect, test } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, openGame, PREFERENCE_KEY, progress } from './gameHarness.ts';

test('best scores improve, survive reload and ignore equal/worse/completed imports', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => localStorage.setItem('unrelated-key', 'keep me'));
  for (const startingMoves of [9, 7, 7, 10]) {
    await loadSnapshot(page, progress(startingMoves));
    await page.getByRole('button', { name: 'Resume' }).click();
    await cards(page).nth(8).click(); await cards(page).nth(15).click();
    await expect(page.getByText(`Best: ${startingMoves === 9 ? 10 : 8}`, { exact: true })).toBeVisible();
  }
  await loadSnapshot(page, progress(8, true));
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('.card--closed')).toHaveCount(16);
  expect(await page.evaluate(() => localStorage.getItem('unrelated-key'))).toBe('keep me');
});

test('size preferences follow successful loads and reload starts a fresh deal', async ({ page }) => {
  await openGame(page); await loadBoard(page, 'np1-6-1');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('6');
  await loadBoard(page, 'np1-8-01');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('6');
  await expect(cards(page)).toHaveCount(36);
  await loadBoard(page, 'np1-6-1');
  await page.getByRole('combobox', { name: 'Grid size', exact: true }).focus();
  await page.getByRole('combobox', { name: 'Grid size', exact: true }).selectOption('8');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toBeFocused();
  await page.reload();
  await expect(cards(page)).toHaveCount(64);
  await loadSnapshot(page, progress());
  await page.reload();
  await expect(cards(page)).toHaveCount(16);
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
});

test('corrupt preferences and invalid saved records are ignored', async ({ page }) => {
  await openGame(page);
  for (const value of ['{', JSON.stringify({ version: 1, size: 5, best: { 4: 1000000 } }),
    JSON.stringify({ version: 1, size: 4, best: { 4: -1, 6: 1.5 } })]) {
    await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key: PREFERENCE_KEY, text: value });
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('4');
    await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  }
});

for (const failure of ['getter', 'read', 'write']) {
  test(`storage ${failure} failure leaves play available`, async ({ page }) => {
    await page.addInitScript((kind) => {
      if (kind === 'getter') Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
      else Object.defineProperty(Storage.prototype, kind === 'read' ? 'getItem' : 'setItem', {
        value() { throw new Error('blocked'); },
      });
    }, failure);
    await openGame(page); await loadSnapshot(page, progress());
    await page.getByRole('button', { name: 'Resume' }).click();
    await cards(page).nth(8).click(); await cards(page).nth(15).click();
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  });
}

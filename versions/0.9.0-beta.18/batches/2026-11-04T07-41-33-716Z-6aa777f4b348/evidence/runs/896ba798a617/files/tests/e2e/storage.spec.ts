import { test, expect, cards, status, loadBoard, loadSnapshot, exported, almostWon,
  finishLastPair, PREFERENCES_KEY, blankSnapshot } from './game.ts';

test('better, equal and worse completions preserve best records across reloads and sizes', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated-setting', 'keep'));
  for (const moves of [10, 10, 12, 8, 8, 9]) {
    await loadSnapshot(page, almostWon(moves - 1));
    await finishLastPair(page);
    await expect(status(page, 'Best')).toHaveText(`Best: ${moves >= 10 ? 10 : 8}`);
  }
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(status(page, 'Best')).toHaveText('Best: 8');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(status(page, 'Best')).toHaveText('Best: 8');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(status(page, 'Best')).toHaveText('Best: none');
  await cards(page).nth(0).click();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(cards(page)).toHaveCount(36);
  await expect(cards(page).locator('svg')).toHaveCount(0);
  await expect(status(page, 'Moves')).toHaveText('Moves: 0');
  await page.getByLabel('Grid size').selectOption('4');
  await expect(status(page, 'Best')).toHaveText('Best: 8');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-setting'))).toBe('keep');
  const text = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(text).toBe('{"size":4,"best":{"4":8}}');
});

test('successful loads save size; failed loads preserve it and reloading starts fresh', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-8-42');
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  await loadBoard(page, 'np1-3-1');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  await loadSnapshot(page, { ...blankSnapshot, boardCode: 'np1-10-42' });
  await expect(page.getByLabel('Grid size')).toHaveValue('10');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('10');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  expect((await exported(page)).started).toBe(false);
});

for (const saved of ['{', '{"size":5,"best":{"4":1000000}}', '{"size":"16","best":{"4":-1}}']) {
  test(`ignores invalid saved preferences ${saved}`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: PREFERENCES_KEY, value: saved });
    await page.goto('/');
    await expect(page.getByLabel('Grid size')).toHaveValue('4');
    await expect(status(page, 'Best')).toHaveText('Best: none');
    await cards(page).nth(0).click();
    await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  });
}

for (const failure of ['getter', 'read', 'write']) {
  test(`storage ${failure} failure leaves a complete playable session`, async ({ page }) => {
    await page.addInitScript((kind) => {
      const unavailable = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
      if (kind === 'getter') Object.defineProperty(window, 'localStorage', { get: unavailable });
      else Object.defineProperty(Storage.prototype, kind === 'read' ? 'getItem' : 'setItem', { value: unavailable });
    }, failure);
    await page.goto('/');
    await loadSnapshot(page, almostWon());
    await finishLastPair(page);
    await expect(status(page, 'Best')).toHaveText('Best: 8');
    await expect(page.locator('.win-banner')).toBeVisible();
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(status(page, 'Moves')).toHaveText('Moves: 0');
  });
}

import { expect, test } from '@playwright/test';
import { card, loadBoard, pairsFor, pauseClock } from './helpers.ts';

async function finishDeal(page: import('@playwright/test').Page, missFirst: boolean): Promise<void> {
  const code = 'np1-4-1';
  await loadBoard(page, code);
  if (missFirst) {
    await card(page, 0).dispatchEvent('click');
    await card(page, 1).dispatchEvent('click');
    await page.clock.runFor(800);
  }
  for (const [first, second] of pairsFor(code).values()) {
    await card(page, first).dispatchEvent('click');
    await card(page, second).dispatchEvent('click');
  }
}

test('better, equal and worse play results persist without changing unrelated keys', async ({ page }) => {
  await pauseClock(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('neon-pairs.preferences.v1') === null) {
      localStorage.setItem('neon-pairs.preferences.v1', JSON.stringify({ version: 1, size: 4, bests: { 4: 9 } }));
    }
    if (localStorage.getItem('unrelated') === null) localStorage.setItem('unrelated', 'untouched');
  });
  await page.goto('/');
  await finishDeal(page, false);
  await expect(page.getByText('Moves: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await finishDeal(page, false);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await finishDeal(page, true);
  await expect(page.getByText('Moves: 9', { exact: true })).toBeVisible();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('unrelated'))).toBe('untouched');
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

test('grid size persists, successful loads select their size and invalid loads do not', async ({ page }) => {
  await page.goto('/');
  const size = page.getByRole('combobox', { name: 'Grid size' });
  await size.selectOption('8');
  const selectedCode = await page.locator('.board-code-current').innerText();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('8');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('.board-code-current')).not.toHaveText(selectedCode);
  await loadBoard(page, 'np1-6-1');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('6');
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-0');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('6');
});

test('invalid saved preferences are ignored and supported bests survive separately', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neon-pairs.preferences.v1',
    JSON.stringify({ version: 1, size: 4, bests: { 4: 9999999, 6: 5 } })));
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Grid size' }).selectOption('6');
  await expect(page.getByText('Best: 5', { exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('neon-pairs.preferences.v1',
    JSON.stringify({ version: 1, size: 5, bests: {} })));
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
});

test('blocked localStorage access leaves the game playable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    configurable: true, get() { throw new DOMException('Storage blocked', 'SecurityError'); },
  }));
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Grid size' }).selectOption('6');
  await card(page, 0).click();
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await expect(page.getByText('Pairs: 0/18', { exact: true })).toBeVisible();
});

test('a preference read failure falls back to the playable default', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === 'neon-pairs.preferences.v1') throw new DOMException('Read blocked', 'SecurityError');
      return original.call(this, key);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
  await card(page, 0).click();
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
});

test('a preference write failure does not block the in-memory game', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'neon-pairs.preferences.v1') throw new DOMException('Write blocked', 'QuotaExceededError');
      Reflect.set(window.localStorage, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Grid size' }).selectOption('6');
  await card(page, 0).click();
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await expect(page.getByText('Pairs: 0/18', { exact: true })).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { completedSnapshot, DEFAULT_CODE, loadSnapshot, onePairRemainingSnapshot, openReproduction } from './helpers.ts';

test('best scores improve, survive reload, and leave unrelated storage keys intact', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('neon-pairs-preferences-v1', JSON.stringify({ size: 4, bestScores: { 4: 13 } }));
    localStorage.setItem('unrelated-setting', 'keep-me');
  });
  await page.reload();

  async function winSnapshot(moves: number): Promise<void> {
    const progress = onePairRemainingSnapshot(DEFAULT_CODE, moves);
    await loadSnapshot(page, progress.json);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.locator('.memory-card').nth(progress.second).click();
  }

  await winSnapshot(11);
  await expect(page.getByText('Moves: 12')).toBeVisible();
  await expect(page.getByText('Best: 12')).toBeVisible();
  let saved = await page.evaluate(() => ({
    preferences: localStorage.getItem('neon-pairs-preferences-v1'),
    unrelated: localStorage.getItem('unrelated-setting'),
  }));
  expect(saved.unrelated).toBe('keep-me');
  expect(saved.preferences).toContain('"4":12');

  await page.reload();
  await winSnapshot(11);
  await expect(page.getByText('Best: 12')).toBeVisible();
  await page.reload();
  await winSnapshot(12);
  await expect(page.getByText('Best: 12')).toBeVisible();
  await page.reload();
  await loadSnapshot(page, completedSnapshot(DEFAULT_CODE));
  await expect(page.getByText('Best: 12')).toBeVisible();
  saved = await page.evaluate(() => ({
    preferences: localStorage.getItem('neon-pairs-preferences-v1'),
    unrelated: localStorage.getItem('unrelated-setting'),
  }));
  expect(saved.unrelated).toBe('keep-me');
  expect(saved.preferences).toContain('"4":12');
});

test('play continues when browser storage throws', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => { throw new DOMException('Storage unavailable', 'SecurityError'); },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await openReproduction(page);
  await page.getByLabel('Board code').fill(DEFAULT_CODE);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await page.locator('.memory-card').nth(0).click();
  await page.locator('.memory-card').nth(11).click();
  await expect(page.getByText('Pairs: 1/8')).toBeVisible();
  expect(errors).toEqual([]);
});

test('HTTP reload remembers a loaded size while starting a fresh deal', async ({ page }) => {
  await page.goto('/');
  await openReproduction(page);
  await page.getByLabel('Board code').fill('np1-6-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  const codeBeforeReload = await page.getByLabel('Board code').inputValue();
  await page.locator('.memory-card').nth(0).click();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.memory-card')).toHaveCount(36);
  await openReproduction(page);
  await expect(page.getByLabel('Board code')).not.toHaveValue(codeBeforeReload);
});

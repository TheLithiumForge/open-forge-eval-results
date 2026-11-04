import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('the distribution opens from disk with network blocked', async ({ browser }) => {
  const context = await browser.newContext();
  await context.route('**/*', (route) => {
    const protocol = new URL(route.request().url()).protocol;
    return protocol === 'file:' ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await expect(page.locator('[aria-label="Game board"] button')).toHaveCount(16);
  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await expect(page.getByRole('button', { name: /Row 1, column 1, .* revealed/ })).toBeVisible();
  await context.close();
});

test('local HTTP preferences persist and unrelated storage keys remain intact', async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error('Playwright preview server did not provide a base URL.');
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.evaluate(() => {
    localStorage.setItem('unrelated-project-key', 'keep-me');
    localStorage.setItem('neon-pairs.preferences.v1', JSON.stringify({ size: 6 }));
  });
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('[aria-label="Game board"] button')).toHaveCount(36);
  await page.getByLabel('Grid size').selectOption('4');
  const values = await page.evaluate(() => ({
    size: localStorage.getItem('neon-pairs.preferences.v1'),
    unrelated: localStorage.getItem('unrelated-project-key'),
  }));
  expect(values.size).toBe('{"size":4}');
  expect(values.unrelated).toBe('keep-me');
  await context.close();
});

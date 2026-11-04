import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

test('the sole distribution file plays directly from disk without a network request', async ({ page, context }) => {
  expect(await readdir('dist')).toEqual(['index.html']);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+\bsrc\s*=|<link[^>]+rel=["']stylesheet/);
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('file:')) external.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await context.setOffline(true);
  await context.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.locator('.card')).toHaveCount(16);
  await page.locator('.card').first().click();
  await expect(page.locator('.card').first()).toHaveAccessibleName(/revealed$/);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

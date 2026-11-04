import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { finish, loadBoard } from './helpers.ts';

test('standalone built HTML plays directly from disk with network blocked', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const requests: string[] = [];
  await context.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs', exact: true })).toBeVisible();
  await loadBoard(page);
  await finish(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});

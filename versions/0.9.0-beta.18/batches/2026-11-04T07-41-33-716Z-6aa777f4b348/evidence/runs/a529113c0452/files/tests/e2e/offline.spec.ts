import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, deal, finish, loadBoard, stat } from './support.ts';

test('single built HTML plays from disk with networking blocked', async ({ page, context }) => {
  expect(await readdir('dist')).toEqual(['index.html']);
  const network: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await context.setOffline(true);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(cards(page)).toHaveCount(16);
  await loadBoard(page);
  await finish(page, deal());
  await expect(stat(page, 'Pairs')).toHaveText('Pairs: 8/8');
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(stat(page, 'Moves')).toHaveText('Moves: 0');
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('audio, video, canvas')).toHaveCount(0);
});

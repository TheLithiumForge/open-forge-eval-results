import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, loadBoard, playAll } from './helpers.ts';

test('the single offline HTML plays from disk with no network, audio or runtime errors', async ({ browser }) => {
  expect(await readdir('dist')).toEqual(['index.html']);
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await playAll(page);
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('audio, video, canvas, iframe')).toHaveCount(0);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/AudioContext|webkitAudioContext|new Audio\(|\.mp3|\.wav|clipboard\.write/);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/maximum-scale|user-scalable/);
  await context.close();
});

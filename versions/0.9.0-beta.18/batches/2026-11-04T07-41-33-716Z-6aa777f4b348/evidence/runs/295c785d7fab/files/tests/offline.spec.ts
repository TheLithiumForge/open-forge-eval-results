import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { activate, loadBoard, solve } from './helpers.ts';

test('single built HTML plays directly from disk with network unavailable', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const requests: string[] = [];
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await context.route(/^https?:/, route => route.abort());
  try {
    await page.goto(pathToFileURL(resolve('dist/index.html')).href);
    await expect(page.locator('.card')).toHaveCount(16);
    await loadBoard(page);
    await activate(page, 0);
    await expect(page.locator('.card').first()).toHaveAccessibleName(/cyan solid plus.*revealed/);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await solve(page, 'np1-4-1');
    await expect(page.locator('script[src], link[href], img[src], audio, video, canvas')).toHaveCount(0);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, finishDeal, loadBoard } from './deal-actions.ts';

test('the one-file distribution plays to completion from disk with network blocked and no audio', async ({ page, context }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await context.setOffline(true);
  await context.route(/^https?:/, route => route.abort());
  await page.addInitScript(() => {
    for (const name of ['Audio', 'AudioContext', 'webkitAudioContext']) {
      Object.defineProperty(window, name, { configurable: true, value: function () { throw new Error('Unexpected audio API'); } });
    }
  });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page);
  await expect(page.locator('script[src], link[href], img[src], audio, video, canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /sound|replay/i })).toHaveCount(0);
  await expect(page.locator('.card-face')).toHaveCount(0);
  const hiddenMarkup = await cards(page).evaluateAll(elements => elements.map(element => element.outerHTML));
  expect(hiddenMarkup.every(text => !/data-face|cyan|magenta|solid|outline|card-face/.test(text))).toBe(true);
  await finishDeal(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await readdir('dist')).toEqual(['index.html']);
});

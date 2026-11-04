import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, finish, loadBoard } from './helpers.ts';

test('single HTML plays from disk with networking blocked and produces no audio', async ({ page, context }) => {
  const errors: string[] = [];
  const networkRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) networkRequests.push(request.url()); });
  await context.setOffline(true);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
  await loadBoard(page);
  await finish(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(cards(page)).toHaveCount(16);
  await expect(page.locator('audio,video,canvas,script[src],link[rel="stylesheet"],img[src^="http"]')).toHaveCount(0);
  expect(networkRequests).toEqual([]);
  expect(errors).toEqual([]);
  const scripts = await page.locator('script').allTextContents();
  expect(scripts.join('')).not.toMatch(/AudioContext|new Audio\(|\.play\(/);
});

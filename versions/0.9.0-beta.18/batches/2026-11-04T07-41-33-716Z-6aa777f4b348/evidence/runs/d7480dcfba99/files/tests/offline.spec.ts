import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { cards, loadBoard, solve } from './helpers.ts';

test('single HTML plays silently from disk with all network blocked', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    for (const name of ['Audio', 'AudioContext', 'webkitAudioContext']) {
      Object.defineProperty(window, name, { configurable: true, value() { throw new Error('Audio is forbidden'); } });
    }
  });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page);
  const closed = await cards(page).first().innerHTML();
  expect(closed).not.toMatch(/face|cyan|data-id|circle|marker/);
  expect(await cards(page).first().getAttribute('aria-label')).toBe('Row 1, column 1, closed');
  await solve(page, 'np1-4-1');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+(?:stylesheet|preload)/);
  await page.screenshot({ path: 'artifacts/neon-pairs.png', fullPage: true });
  await context.close();
});

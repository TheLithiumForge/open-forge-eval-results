import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, finish, loadBoard } from './journey.ts';

test('the standalone HTML plays from disk with network disabled', async ({ page, context }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await context.route(/^https?:/, route => route.abort());
  await context.setOffline(true);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(cards(page)).toHaveCount(16);
  await loadBoard(page);
  await finish(page);
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)="(?:\/assets|https?:)/);
  expect(html).not.toMatch(/AudioContext|new Audio\(|<audio|<canvas/);
});

test('blocked storage still allows play, export, restart and completion', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
  });
  await page.goto('/'); await loadBoard(page); await finish(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, finish, loadBoard } from './helpers.ts';

test('the distribution plays from disk with all network requests blocked', async ({ page, context }) => {
  const requests: string[] = [];
  await context.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  await context.setOffline(true);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page);
  await finish(page);
  await expect(page.locator('.win-banner')).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+(?:stylesheet|modulepreload)|<audio|<canvas/);
});

test('denied browser storage leaves all game controls playable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await loadBoard(page);
  await finish(page);
  await expect(page.locator('.scoreboard')).toContainText('Best: 8');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(cards(page)).toHaveCount(16);
});


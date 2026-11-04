import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { card, finish, loadBoard } from './gameActions.ts';

test('single offline HTML plays through victory with network blocked and no audio', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  try {
    const page = await context.newPage();
    const requests: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => { requests.push(request.url()); });
    page.on('pageerror', (error) => { errors.push(error.message); });
    await context.route('**/*', (route) => /^https?:/.test(route.request().url()) ? route.abort() : route.continue());
    const mainFile = pathToFileURL(resolve('dist/index.html')).href;
    await page.goto(mainFile);
    await loadBoard(page);
    await card(page, 0).hover();
    await finish(page);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await card(page, 0).click();
    await card(page, 1).click();
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(page.locator('audio,video')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /sound|mute|audio/i })).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(requests).toEqual([mainFile]);
    const html = await readFile('dist/index.html', 'utf8');
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+(?:stylesheet|preload)|AudioContext|new Audio\(|\.mp3|\.wav/);
    expect(html).toContain('width=device-width, initial-scale=1.0');
    expect(html).not.toMatch(/user-scalable=no|maximum-scale=1/);
  } finally { await context.close(); }
});

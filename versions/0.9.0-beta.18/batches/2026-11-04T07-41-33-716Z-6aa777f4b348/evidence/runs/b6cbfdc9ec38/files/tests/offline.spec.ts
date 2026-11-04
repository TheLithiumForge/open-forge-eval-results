import { expect, test } from '@playwright/test';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { cards, finish, loadBoard, openGame } from './gameHarness.ts';

test('single HTML plays from disk with network blocked and no audio APIs', async ({ page, browser }) => {
  expect(await readdir('dist')).toEqual(['index.html']);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+rel="stylesheet"|<audio|<canvas/);
  expect(html).not.toMatch(/maximum-scale|user-scalable=no/);
  const errors: string[] = []; const requests: string[] = []; const allRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    allRequests.push(request.url());
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await page.addInitScript(() => {
    const fail = () => { throw new Error('Unexpected audio API use.'); };
    for (const name of ['Audio', 'AudioContext', 'webkitAudioContext']) {
      Object.defineProperty(window, name, { configurable: true, value: fail });
    }
    HTMLMediaElement.prototype.play = fail;
  });
  await openGame(page, true); await loadBoard(page); await finish(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(0).click(); await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('audio, video, canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /sound|replay/i })).toHaveCount(0);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
  expect(allRequests).toEqual([expect.stringMatching(/^file:.*\/dist\/index\.html$/)]);
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/offline-check.json', JSON.stringify({ chromium: browser.version(),
    networkBlocked: true, requests: allRequests, networkRequests: requests, pageErrors: errors,
    audioApisTrapped: true, completedGame: true }, null, 2) + '\n');
});

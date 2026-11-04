import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { cards, finish, loadBoard } from './journey.ts';

test('single built HTML plays directly from disk with the network blocked', async ({ page }) => {
  const networkRequests: string[] = [];
  page.on('request', request => {
    if (/^https?:/.test(request.url())) networkRequests.push(request.url());
  });
  await page.route('https://**/*', route => route.abort());
  await page.route('http://**/*', route => route.abort());
  await page.context().setOffline(true);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page);
  await finish(page);
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  expect(networkRequests).toEqual([]);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+rel="stylesheet"|<audio|<canvas/);
});

test('corrupt or unavailable storage leaves play usable and unrelated keys untouched', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('neon-pairs.preferences.v1', '{invalid');
    localStorage.setItem('unrelated', 'keep');
  });
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await loadBoard(page);
  await finish(page);
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Unavailable'); } });
  });
  await page.reload();
  await loadBoard(page);
  await cards(page).first().click();
  await expect(cards(page).first().locator('svg')).toHaveCount(1);
});

test('replay CLI prints only a final snapshot or rejects input with empty stdout', async ({}, testInfo) => {
  const path = testInfo.outputPath('replay.json');
  await writeFile(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
    actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
  const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
  expect(valid.status).toBe(0);
  expect(valid.stderr).toBe('');
  expect(JSON.parse(valid.stdout)).toEqual({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
  await writeFile(path, '{"version":99}');
  const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout).toBe('');
  expect(invalid.stderr).toContain('Invalid replay.');
});

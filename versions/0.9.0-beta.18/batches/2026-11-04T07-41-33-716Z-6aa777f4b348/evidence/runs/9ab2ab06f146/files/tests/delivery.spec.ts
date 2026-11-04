import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cards, loadBoard, solve } from './helpers.ts';

test('the single HTML plays from disk with all network requests blocked and no audio', async ({ page }) => {
  const htmlUrl = new URL('../dist/index.html', import.meta.url);
  const html = await readFile(htmlUrl, 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=|<audio|<video/);
  const requests: string[] = [];
  await page.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  await page.addInitScript(() => {
    for (const name of ['Audio', 'AudioContext', 'webkitAudioContext']) {
      Object.defineProperty(window, name, { get() { throw new Error(`Audio API used: ${name}`); } });
    }
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(htmlUrl.href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await solve(page);
  await expect(page.locator('.win-banner')).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.locator('audio, video, canvas, iframe').count()).toBe(0);
});

test('documented replay CLI prints only the snapshot or fails cleanly', async ({}, testInfo) => {
  const path = testInfo.outputPath('replay.json');
  await writeFile(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
    actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { cwd, encoding: 'utf8' });
  expect(valid.status).toBe(0);
  expect(valid.stderr).toBe('');
  const output: unknown = JSON.parse(valid.stdout);
  expect(output).toEqual({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
  await writeFile(path, '{invalid');
  const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { cwd, encoding: 'utf8' });
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout).toBe('');
  expect(invalid.stderr).toContain('Invalid replay.');
  const missing = spawnSync('npm', ['run', '--silent', 'replay', '--', `${path}.missing`], { cwd, encoding: 'utf8' });
  expect(missing.status).not.toBe(0);
  expect(missing.stdout).toBe('');
});

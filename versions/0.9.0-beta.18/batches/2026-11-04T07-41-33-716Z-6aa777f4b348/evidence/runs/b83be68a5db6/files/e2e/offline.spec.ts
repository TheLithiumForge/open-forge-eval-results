import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { exported, loadBoard, pairs4 } from './helpers.ts';

test('the single HTML plays from disk with all network requests blocked', async ({ page, context }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:\/\//, route => route.abort());
  await context.setOffline(true);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page);
  for (const pair of pairs4) for (const index of pair) await page.locator('.card').nth(index).click();
  await expect(page.locator('.win-banner')).toContainText('8 moves');
  expect((await exported(page)).matched.length).toBe(16);
  await expect(page.locator('audio, video, canvas, iframe')).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await mkdir('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/offline-win.png', fullPage: true });
});

test('replay CLI prints only a final snapshot and rejects invalid files', async () => {
  await mkdir('test-results/cli', { recursive: true });
  const path = resolve('test-results/cli/replay.json');
  await writeFile(path, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
  const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
  expect(valid.status).toBe(0);
  expect(valid.stderr).toBe('');
  expect(JSON.parse(valid.stdout)).toEqual({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
  await writeFile(path, '{"version":2}');
  const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout).toBe('');
  expect(invalid.stderr).toContain('Invalid replay.');
  const missing = spawnSync('npm', ['run', '--silent', 'replay', '--', `${path}.missing`], { encoding: 'utf8' });
  expect(missing.status).not.toBe(0);
  expect(missing.stdout).toBe('');
});

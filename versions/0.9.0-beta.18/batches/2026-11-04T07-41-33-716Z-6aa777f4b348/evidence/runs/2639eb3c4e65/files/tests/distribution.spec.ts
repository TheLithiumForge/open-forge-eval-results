import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { finish, loadBoard } from './helpers.ts';

test('built HTML plays directly from disk with all networking disabled', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const network: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await loadBoard(page);
  await finish(page);
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+rel="stylesheet"|AudioContext|new Audio\(/);
  await context.close();
});

test('replay command emits only final JSON, rejects invalid input and missing files', async ({}, testInfo) => {
  const file = testInfo.outputPath('replay.json');
  await writeFile(file, JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
  const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', file], { encoding: 'utf8' });
  expect(valid.status).toBe(0);
  expect(valid.stderr).toBe('');
  expect(JSON.parse(valid.stdout)).toEqual({ version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
  await writeFile(file, '{}');
  const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', file], { encoding: 'utf8' });
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout).toBe('');
  expect(invalid.stderr).toContain('Invalid replay.');
  const missing = spawnSync('npm', ['run', '--silent', 'replay', '--', `${file}.missing`], { encoding: 'utf8' });
  expect(missing.status).not.toBe(0);
  expect(missing.stdout).toBe('');
  expect(missing.stderr).not.toBe('');
});

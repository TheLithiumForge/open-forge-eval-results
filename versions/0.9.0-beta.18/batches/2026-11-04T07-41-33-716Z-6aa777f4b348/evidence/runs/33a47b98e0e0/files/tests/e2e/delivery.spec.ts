import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { boardFor, cardAt, finishByPointer, openReproduction, pairPositions } from './helpers.ts';

test('offline single-file distribution completes, resets, and loads a board without network traffic', async ({ browser }) => {
  const context = await browser.newContext({ offline: true, viewport: { width: 1_280, height: 800 } });
  const networkRequests: string[] = [];
  const scriptErrors: string[] = [];
  try {
    const page = await context.newPage();
    page.on('request', (request) => networkRequests.push(request.url()));
    page.on('pageerror', (error) => scriptErrors.push(error.message));
    const distribution = pathToFileURL(resolve('dist/index.html')).href;
    await page.goto(distribution);
    await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
    await expect(page.locator('.game-card')).toHaveCount(16);
    await openReproduction(page);
    const code = await page.getByLabel('Board code').inputValue();
    await finishByPointer(page, code);
    await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.locator('.status-readout')).toContainText('Moves: 0');
    await page.getByLabel('Board code').fill('np1-4-1');
    await page.getByRole('button', { name: 'Load board', exact: true }).click();
    const expected = pairPositions(boardFor('np1-4-1'))[0];
    if (expected === undefined || expected[0] === undefined || expected[1] === undefined) throw new Error('Offline pair fixture missing');
    await cardAt(page, expected[0]).click();
    await cardAt(page, expected[1]).click();
    await expect(page.locator('.status-readout')).toContainText('Pairs: 1/8');
    await expect(page).toHaveURL(distribution);
    expect(networkRequests.filter((url) => url !== distribution)).toEqual([]);
    expect(networkRequests.filter((url) => /^https?:/.test(url))).toEqual([]);
    expect(scriptErrors).toEqual([]);
    const html = await readFile(resolve('dist/index.html'), 'utf8');
    expect(html).toContain('<title>Neon Pairs</title>');
    expect(html).not.toMatch(/(?:src|href)=["']\/assets\//);
  } finally {
    await context.close();
  }
});

test('documented replay command prints only its final snapshot and rejects invalid input', async () => {
  const directory = resolve('evidence/replay');
  await mkdir(directory, { recursive: true });
  const validPath = resolve(directory, 'example.json');
  const invalidPath = resolve(directory, 'invalid.json');
  await writeFile(validPath, JSON.stringify({
    version: 1, boardCode: 'np1-4-1',
    actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
  }), 'utf8');
  await writeFile(invalidPath, '{', 'utf8');
  const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', validPath], { encoding: 'utf8' });
  expect(valid.status).toBe(0);
  expect(valid.stderr).toBe('');
  expect(valid.stdout).toContain('"moves": 1');
  expect(valid.stdout).toContain('"matched": [\n    0,\n    11\n  ]');
  const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', invalidPath], { encoding: 'utf8' });
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout).toBe('');
  expect(invalid.stderr).not.toBe('');
  await writeFile(resolve(directory, 'example-output.json'), valid.stdout, 'utf8');
  await writeFile(resolve(directory, 'invalid-output.txt'), invalid.stderr, 'utf8');
});

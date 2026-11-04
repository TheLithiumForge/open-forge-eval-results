import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, finish, loadBoard } from './gameFixtures.ts';

const exec = promisify(execFile);

test('one HTML opens from disk offline and plays through completion without network requests', async ({ browser }) => {
  expect(await readdir('dist')).toEqual(['index.html']);
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const errors: string[] = [];
  const network: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs', exact: true })).toBeVisible();
  await loadBoard(page);
  await finish(page);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(cards(page)).toHaveCount(16);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('audio, video, canvas')).toHaveCount(0);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+(?:stylesheet|modulepreload)/);
  await context.close();
});

test('replay command emits only a final snapshot or only stderr on errors', async () => {
  const directory = await mkdtemp(`${tmpdir()}/neon-replay-`);
  try {
    const file = `${directory}/replay.json`;
    await writeFile(file, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 }], endMs: 800 }));
    const valid = await exec('npm', ['run', '--silent', 'replay', '--', file]);
    expect(valid.stderr).toBe('');
    expect(JSON.parse(valid.stdout)).toMatchObject({ version: 1, moves: 1, elapsedMs: 800, selection: { kind: 'one', index: 2 } });
    for (const contents of ['{', '{"version":2}']) {
      await writeFile(file, contents);
      const result = await exec('npm', ['run', '--silent', 'replay', '--', file]).then(() => null, (error: unknown) => error);
      expect(result).toMatchObject({ code: 1, stdout: '', stderr: 'Invalid replay.\n' });
    }
    const missing = await exec('npm', ['run', '--silent', 'replay', '--', `${directory}/missing.json`])
      .then(() => null, (error: unknown) => error);
    expect(missing).toMatchObject({ code: 1, stdout: '' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

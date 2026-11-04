import { readdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { loadBoard, solve, start } from './helpers.ts';

test('play, completion and reset never instantiate or play audio', async ({ page }) => {
  const files = await readdir('src', { recursive: true });
  const code = (await Promise.all(files.filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file))
    .map((file) => readFile(`src/${file}`, 'utf8')))).join('\n');
  expect(code).not.toMatch(/new\s+Audio\b|AudioContext|createOscillator|\.play\s*\(/);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const name of ['Audio', 'AudioContext', 'webkitAudioContext']) {
      Object.defineProperty(window, name, { configurable: true, value: function () { throw new Error('Unexpected audio'); } });
    }
    HTMLMediaElement.prototype.play = () => { throw new Error('Unexpected media playback'); };
  });
  await start(page);
  await loadBoard(page);
  await solve(page);
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.locator('audio, video')).toHaveCount(0);
  expect(errors).toEqual([]);
});

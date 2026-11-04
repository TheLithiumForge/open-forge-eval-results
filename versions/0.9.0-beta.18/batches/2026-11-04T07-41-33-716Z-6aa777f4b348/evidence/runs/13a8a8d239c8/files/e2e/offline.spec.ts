import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { parseBoardCode } from '../src/game/board.ts';
import { loadBoard } from './helpers.ts';

test('plays directly from dist with network requests blocked and one self-contained HTML file', async ({ page }) => {
  const htmlPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));
  const html = await readFile(htmlPath, 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=/i);
  expect(html).not.toMatch(/<link[^>]+(?:stylesheet|preload)[^>]*href=/i);
  expect(html).not.toMatch(/(?:src|href)=["']https?:/i);
  expect(html).not.toMatch(/<audio\b|AudioContext|new Audio\(/i);
  const networkRequests: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/i.test(request.url())) networkRequests.push(request.url());
  });
  await page.route(/^https?:\/\//, (route) => route.abort());
  await page.goto(pathToFileURL(htmlPath).href);
  await expect(page).toHaveTitle('Neon Pairs');
  const board = parseBoardCode('np1-4-1');
  if (board === null) throw new Error('The documented board should be valid.');
  const game = page.getByRole('group', { name: '4 by 4 memory board' });
  await loadBoard(page, 'np1-4-1');
  await game.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await game.getByRole('button', { name: 'Row 3, column 4, closed' }).click();
  await expect(page.locator('.game-summary')).toContainText('Pairs: 1/8');
  await page.getByText('Reproduce a game', { exact: true }).click();
  await expect(page.getByLabel('Board code')).toHaveValue('np1-4-1');
  await expect(networkRequests).toEqual([]);
});

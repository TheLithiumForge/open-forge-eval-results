import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect, cards, loadBoard, status, LITERAL_DECK } from './game.ts';

test('isolated dist/index.html completes a game from disk with networking disabled', async ({ browser }) => {
  const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-offline-'));
  const file = join(directory, 'index.html');
  copyFileSync(resolve('dist/index.html'), file);
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const errors: string[] = [];
  const network: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await context.route(/^https?:/, (route) => route.abort());
  try {
    expect(readdirSync(directory)).toEqual(['index.html']);
    const html = readFileSync(file, 'utf8');
    expect(html).not.toMatch(/<script[^>]+\bsrc\s*=|<link[^>]+rel=["']stylesheet/i);
    expect(html).not.toMatch(/AudioContext|createOscillator|new Audio\(|\.(?:mp3|wav|ogg)\b/);
    await page.goto(pathToFileURL(file).href);
    await expect(page.getByRole('heading', { name: 'Neon Pairs', exact: true })).toBeVisible();
    await expect(page.locator('audio, video, canvas')).toHaveCount(0);
    await loadBoard(page);
    for (let face = 0; face < 8; face += 1) {
      for (const [index, value] of LITERAL_DECK.entries()) {
        if (value === face) await cards(page).nth(index).click();
      }
    }
    await expect(status(page, 'Moves')).toHaveText('Moves: 8');
    await expect(page.locator('.win-banner')).toBeVisible();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(status(page, 'Moves')).toHaveText('Moves: 0');
    expect(network).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

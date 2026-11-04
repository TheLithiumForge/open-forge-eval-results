import { mkdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, exported, loadBoard, loadSnapshot } from './actions.ts';

test('the only distribution file plays directly from disk with all networking blocked', async ({ browser }) => {
  const context = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(new URL('../dist/index.html', import.meta.url).href);
    await expect(cards(page)).toHaveCount(16);
    await mkdir('evidence', { recursive: true });
    await page.screenshot({ path: 'evidence/offline-phone.png', fullPage: true });
    await loadBoard(page);
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    const state = await exported(page);
    expect(state.matched).toEqual([0, 11]);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await loadSnapshot(page, JSON.stringify({ version: 1, boardCode: state.board.code,
      matched: state.matched, selection: state.selection, moves: state.moves,
      elapsedMs: state.elapsedMs, started: state.started }));
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    const html = await readFile('dist/index.html', 'utf8');
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+rel=["']stylesheet/);
    expect(html).not.toMatch(/AudioContext|new Audio\(|navigator\.sendBeacon|fetch\(/);
  } finally { await context.close(); }
});

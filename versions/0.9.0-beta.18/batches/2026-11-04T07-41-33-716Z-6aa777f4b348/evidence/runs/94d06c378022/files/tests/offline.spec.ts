import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { clickCard, loadBoard, pairsForCode } from './helpers.ts';

test('the built HTML runs and finishes a game directly from disk while offline', async ({ browser }) => {
  const context = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  try {
    const page = await context.newPage();
    const fileUrl = pathToFileURL(resolve('dist/index.html')).href;
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(fileUrl);
    await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
    await loadBoard(page, 'np1-4-1');
    const pairs = pairsForCode('np1-4-1');
    for (const pair of pairs) {
      await clickCard(page, pair.positions[0]);
      await clickCard(page, pair.positions[1]);
    }
    await expect(page.locator('.win-banner')).toBeVisible();
    expect(requests).toEqual([fileUrl]);
    expect(await page.locator('.board-card').count()).toBe(16);
  } finally {
    await context.close();
  }
});

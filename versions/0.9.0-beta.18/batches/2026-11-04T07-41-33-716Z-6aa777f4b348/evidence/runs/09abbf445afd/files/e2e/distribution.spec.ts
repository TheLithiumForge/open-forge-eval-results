import { expect, test } from '@playwright/test';
import { completedSnapshot } from './helpers.ts';

test('the built HTML plays directly from disk with network access blocked', async ({ browser }) => {
  const context = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  const externalRequests: string[] = [];
  const pageErrors: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('file:')) externalRequests.push(request.url());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.clock.install();
    await page.goto(new URL('../dist/index.html', import.meta.url).href);
    await expect(page.getByRole('heading', { name: 'Neon Pairs', exact: true })).toBeVisible();
    await expect(page.locator('.memory-card')).toHaveCount(16);
    await expect(page.locator('body')).toBeFocused();
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBe('width=device-width, initial-scale=1.0');

    await page.getByText('Reproduce a game', { exact: true }).click();
    await page.getByLabel('Board code').fill('np1-4-1');
    await page.getByRole('button', { name: 'Load board', exact: true }).click();
    await page.locator('.memory-card').nth(0).click();
    await page.locator('.memory-card').nth(11).click();
    await expect(page.getByText('Moves: 1')).toBeVisible();
    await expect(page.getByText('Pairs: 1/8')).toBeVisible();

    await page.getByLabel('Snapshot JSON').fill(completedSnapshot('np1-4-1'));
    await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Every pair found' })).toBeVisible();
    expect(externalRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

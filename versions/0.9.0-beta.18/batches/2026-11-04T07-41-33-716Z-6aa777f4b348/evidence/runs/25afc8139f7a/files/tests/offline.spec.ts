import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { complete, reproduction } from './helpers.ts';

test('single HTML plays a complete silent game directly from disk without network', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route(/^https?:/, async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });
  await context.addInitScript(() => {
    const forbiddenAudio = class { constructor() { throw new Error('Unexpected audio API'); } };
    Object.defineProperty(window, 'Audio', { value: forbiddenAudio });
    Object.defineProperty(window, 'AudioContext', { value: forbiddenAudio });
    HTMLMediaElement.prototype.play = () => { throw new Error('Unexpected media playback'); };
  });
  try {
    await page.goto(pathToFileURL(resolve('dist/index.html')).href);
    await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
    await expect(page.locator('details')).not.toHaveAttribute('open');
    await expect(page.locator('script[src], link[href], audio, video, canvas')).toHaveCount(0);
    await reproduction(page);
    await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
    await page.getByRole('button', { name: 'Load board', exact: true }).click();
    await complete(page);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.locator('.card-closed')).toHaveCount(16);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('reduced motion removes both transitions and completion pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.locator('.card').first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  await reproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await complete(page);
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

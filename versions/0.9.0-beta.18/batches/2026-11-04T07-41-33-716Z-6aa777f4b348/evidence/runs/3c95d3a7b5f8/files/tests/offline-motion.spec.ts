import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, endingSnapshot, finish, loadBoard, loadSnapshot } from './support.ts';
import { swipe } from './touch.ts';

test('plays the single HTML directly from disk with network blocked', async ({ browser }) => {
  expect(readdirSync('dist')).toEqual(['index.html']);
  const context = await browser.newContext({ offline: true });
  const network: string[] = [];
  const errors: string[] = [];
  await context.route(/^https?:/, (route) => route.abort());
  try {
    const page = await context.newPage();
    page.on('request', (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(resolve('dist/index.html')).href);
    await expect(page).toHaveTitle('Neon Pairs');
    await loadBoard(page);
    await finish(page);
    await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    expect(network).toEqual([]);
    expect(errors).toEqual([]);
    await expect(page.locator('audio, video')).toHaveCount(0);
    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).not.toMatch(/new\s+(?:Audio|AudioContext|webkitAudioContext)\s*\(/);
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+rel="stylesheet"/);
  } finally { await context.close(); }
});

for (const reduced of [false, true]) {
  test(`completion motion is ${reduced ? 'disabled' : 'one 600ms pulse'}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await loadSnapshot(page, endingSnapshot());
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(2).click();
    await cards(page).nth(6).click();
    const timing = await page.locator('.win-banner').evaluate((node) => {
      const style = getComputedStyle(node);
      return { duration: style.animationDuration, iterations: style.animationIterationCount, name: style.animationName };
    });
    expect(timing).toEqual(reduced ? { duration: '0s', iterations: '1', name: 'none' }
      : { duration: '0.6s', iterations: '1', name: 'win-pulse' });
    await expect.poll(() => page.locator('.win-banner').evaluate((node) => node.getAnimations().length)).toBe(0);
    expect(await cards(page).first().evaluate((node) => getComputedStyle(node).transitionDuration)).toBe(reduced ? '0s' : '0.12s');
    await expect(page.locator('.win-banner')).toBeVisible();
  });
}

test('reaches both ends of a 16x16 board by native touch scrolling and tapping', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await loadBoard(page, 'np1-16-1');
    const area = page.locator('.board-scroll');
    await area.evaluate((node) => node.scrollIntoView({ block: 'center' }));
    const bounds = await area.boundingBox();
    if (!bounds) throw new Error('Missing board geometry.');
    const client = await context.newCDPSession(page);
    const middle = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const left = { x: bounds.x + 24, y: middle.y };
    const right = { x: bounds.x + bounds.width - 24, y: middle.y };
    const top = { x: middle.x, y: bounds.y + 24 };
    const bottom = { x: middle.x, y: bounds.y + bounds.height - 24 };
    for (let count = 0; count < 3; count += 1) await swipe(page, client, right, left);
    await swipe(page, client, bottom, top);
    await expect.poll(() => area.evaluate((node) => node.scrollLeft)).toBeGreaterThan(400);
    await expect.poll(() => area.evaluate((node) => node.scrollTop)).toBeGreaterThan(200);
    await expect(page.locator('.card--revealed')).toHaveCount(0);
    await cards(page).last().tap();
    await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
    await swipe(page, client, top, bottom);
    for (let count = 0; count < 3; count += 1) await swipe(page, client, left, right);
    await expect.poll(() => area.evaluate((node) => node.scrollLeft)).toBe(0);
    await expect.poll(() => area.evaluate((node) => node.scrollTop)).toBe(0);
    await cards(page).first().tap();
    await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
    await client.detach();
  } finally { await context.close(); }
});

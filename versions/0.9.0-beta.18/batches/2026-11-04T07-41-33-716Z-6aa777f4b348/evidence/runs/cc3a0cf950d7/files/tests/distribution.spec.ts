import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { finish, loadBoard, loadSnapshot, pairsFor, pendingSnapshot, touchScrollToEnd } from './helpers.ts';

test('single HTML plays from disk with network blocked and stays silent', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const requests: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page); await finish(page);
  await expect(page.locator('.win')).toBeVisible();
  expect(requests).toEqual([]);
  const html = readFileSync('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+stylesheet|<audio|AudioContext|createOscillator/);
  await context.close();
});

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large board and complete focus outlines at ${viewport.width}x${viewport.height}`, async ({ browser }, testInfo) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await page.goto('/'); await loadBoard(page, 'np1-16-1');
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(256);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await cards.first().boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    for (const index of [0, 85, 255, 0]) {
      await cards.nth(index).focus();
      const completeOutline = await cards.nth(index).evaluate(element => {
        const card = element.getBoundingClientRect();
        const board = element.closest('.board-scroll')?.getBoundingClientRect();
        return board !== undefined && card.left - 5 >= board.left && card.right + 5 <= board.right &&
          card.top - 5 >= board.top && card.bottom + 5 <= board.bottom;
      });
      expect(completeOutline).toBe(true);
    }
    await cards.first().focus();
    await touchScrollToEnd(page);
    await cards.last().tap();
    await expect(cards.last()).toHaveAccessibleName(/revealed$/);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await cards.first().focus();
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
    await expect(cards.last()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(cards.last()).toHaveAccessibleName(/revealed$/);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('large-board.png'), fullPage: true });
    await loadBoard(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.card').first().tap();
    await expect(page.locator('.card').first()).toHaveAccessibleName(/revealed$/);
    await context.close();
  });
}

test('completion motion runs once, imported wins are static, reduced motion disables it', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  const matched = pairsFor('np1-4-1').flat();
  const finalPair = pairsFor('np1-4-1')[0];
  if (!finalPair) throw new Error('Missing pair');
  await loadSnapshot(page, { ...pendingSnapshot, matched: matched.filter(index => !finalPair.includes(index)),
    selection: { kind: 'closed' }, moves: 7 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of finalPair) await page.locator('.card').nth(index).click();
  expect(await page.locator('.win').evaluate(element => getComputedStyle(element).animationDuration)).toBe('0.6s');
  expect(await page.locator('.win').evaluate(element => getComputedStyle(element).animationIterationCount)).toBe('1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.win').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.card').first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
});

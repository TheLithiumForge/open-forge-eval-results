import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, evidence, finish, loadCode, loadSnapshot, nearWin, touchScrollBoard } from './fixtures.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large boards, focus outlines and zoom layout at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await loadCode(page);
    await expect(cards(page)).toHaveCount(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const phoneBoard = await page.locator('.board-scroll').evaluate(node => node.scrollWidth <= node.clientWidth);
    expect(phoneBoard).toBe(true);
    await cards(page).nth(0).tap();
    await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
    await loadCode(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await cards(page).nth(0).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBe(box?.width);
    await cards(page).nth(0).focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await expect(cards(page).nth(0)).toBeFocused();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(cards(page).nth(0)).toBeFocused();
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
    await expect(cards(page).nth(255)).toBeFocused();
    const fits = await cards(page).nth(255).evaluate(node => {
      const parent = node.closest('.board-scroll');
      if (!parent) return false;
      const card = node.getBoundingClientRect();
      const area = parent.getBoundingClientRect();
      return card.left - 5 >= area.left && card.top - 5 >= area.top &&
        card.right + 5 <= area.right && card.bottom + 5 <= area.bottom;
    });
    expect(fits).toBe(true);
    await page.keyboard.press('Enter');
    await expect(cards(page).nth(255)).toHaveAccessibleName(/revealed$/);
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(cards(page).nth(255)).toBeFocused();
    // Start at the first card, then exercise native touch panning on both axes.
    await page.locator('.board-scroll').evaluate(node => node.scrollTo(0, 0));
    await cards(page).nth(0).tap();
    await touchScrollBoard(page, true);
    await expect(cards(page).nth(255)).toBeInViewport();
    await cards(page).nth(255).tap();
    await touchScrollBoard(page, false);
    await expect(cards(page).nth(0)).toBeInViewport();
    await loadSnapshot(page, nearWin(8, true));
    await expect(page.locator('.win-banner')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}

test('standalone disk distribution plays with network blocked and stays silent', async ({ browser }, info) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const network: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => /^https?:/.test(route.request().url()) ? route.abort() : route.continue());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadCode(page);
  await finish(page);
  await evidence(info, 'offline.png', await page.screenshot(), 'image/png');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('audio, video, canvas, script[src], link[rel="stylesheet"]')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').length)).toBe(0);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/AudioContext|new Audio\(|speechSynthesis|data-face|window\.__/);
  await context.close();
});

test('all 128 faces at 44px in grayscale and reduced-motion completion', async ({ page }, info) => {
  await page.setViewportSize({ width: 840, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loadSnapshot(page, { version: 1, boardCode: 'np1-16-1', matched: Array.from({ length: 256 }, (_, i) => i),
    selection: { kind: 'closed' }, moves: 128, elapsedMs: 10000, started: true });
  const sheet = await page.evaluate(() => {
    const faces = new Map<string, Element>();
    for (const button of document.querySelectorAll('.card')) {
      const name = button.getAttribute('aria-label')?.split(', ').slice(2).join(', ') ?? '';
      const svg = button.querySelector('svg');
      if (svg) faces.set(name, svg);
    }
    const section = document.createElement('section');
    section.id = 'test-face-sheet';
    section.style.cssText = 'display:grid;grid-template-columns:repeat(16,44px);gap:6px;padding:6px;width:max-content;filter:grayscale(1);background:#111625';
    for (const [name, svg] of [...faces].sort(([a], [b]) => a.localeCompare(b))) {
      const tile = document.createElement('div');
      tile.style.cssText = 'width:44px;height:44px';
      tile.title = name;
      tile.append(svg.cloneNode(true));
      section.append(tile);
    }
    document.body.append(section);
    return faces.size;
  });
  expect(sheet).toBe(128);
  await evidence(info, 'faces-grayscale.png', await page.locator('#test-face-sheet').screenshot(), 'image/png');
  await loadSnapshot(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  expect(await page.locator('.win-banner').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  expect(await cards(page).nth(0).evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.locator('.win-banner').evaluate(node => getComputedStyle(node).animationDuration)).toBe('0.6s');
  expect(await page.locator('.win-banner').evaluate(node => getComputedStyle(node).animationIterationCount)).toBe('1');
});
